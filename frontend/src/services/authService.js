/** @Author - Ram-Ambati
 * Auth Service - Handles all authentication API calls
 * Assumes backend endpoints:
 * - GET /api/auth/me - Get current user session
 * - POST /api/auth/login - Sign in
 * - POST /api/auth/register - Create account
 * - POST /api/auth/logout - Sign out
 * - GET /api/session/guest - Create/get guest session
 * - GET /api/limits/current - Get current user limits
 */
 //If deployed the production ENV fills VITE_API_BASE_URL or it just uses local host.
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Guest Session Management
//These will be set into browsers local storage in Application Tab by.
const GUEST_ID_KEY = 'lfs_guest_id';
const WELCOME_SEEN_KEY = 'lfs_welcome_seen';

// ─── JWT Decode Helpers (no secret needed — reads public claims from token) ───

function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isJwtExpired(token) {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return true;
  // exp is in seconds since epoch; add 30s buffer to avoid using near-expiry tokens
  // 30 seconds buffer so we don't send a token that's literally about to expire in the next request
  return Date.now() >= (payload.exp * 1000) - 30000;
}

function getUserFromJwt(token) {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return {
    id: parseInt(payload.sub, 10),
    username: payload.username,
    email: payload.email,
    role: payload.role,
  };
}

export const authService = {
  // Check current auth status (with optimistic JWT decode for cold-start resilience)
  async checkSession() {
    // ─── STEP 1: Optimistic JWT decode (instant, no network call) ───
    // If we have a non-expired JWT, trust it immediately.
    // The server will be verified in the background by verifySessionWithRetry().
    const token = localStorage.getItem('lfs_jwt_token'); // we read it from localStorage because cookies were causing CORS nightmares on Render + Vercel
    if (token) {
      if (!isJwtExpired(token)) {
        const user = getUserFromJwt(token);
        if (user) {
          return { type: 'signed-in', user, optimistic: true };
        }
      }
      // JWT is expired or unreadable (or if I manually tampered with it) — clear it and force guest mode
      localStorage.removeItem('lfs_jwt_token');
    }

    // ─── STEP 2: Check existing guest session ───
    let guestId = this.getGuestId();
    if (guestId) {
      try {
        const valRes = await fetch(`${API_BASE}/session/validate?guestToken=${encodeURIComponent(guestId)}`);
        if (valRes.ok) {
          const valData = await valRes.json();
          if (valData.valid) {
            return { type: 'guest', guestId };
          }
        }
      } catch (e) {
        console.error('Error validating guest session:', e);
        // Backend unreachable — keep guest token, assume still valid
        return { type: 'guest', guestId };
      }
      this.clearGuestId(); // validation failed on server, clear expired guest token so we don't get stuck in a 401 loop
    }

    // ─── STEP 3: Auto-create guest session (only if backend is reachable) ───
    if (this.isWelcomeSeen()) {
      try {
        const session = await this.createGuestSession();
        return { type: 'guest', guestId: session.guestId };
      } catch (error) {
        console.error('Error auto-creating guest session:', error);
        // Backend unreachable — return 'new' instead of creating fake guest
      }
    }

    return { type: 'new' };
  },

  // Verify session with backend, retrying for Render cold-start scenarios.
  // Returns: { type: 'signed-in', user } | { type: 'invalid' } | null (unreachable)
  async verifySessionWithRetry(maxRetries = 5, delayMs = 4000) {
    const token = localStorage.getItem('lfs_jwt_token');
    if (!token) return { type: 'invalid' };

    const headers = { 'Authorization': `Bearer ${token}` };

    for (let attempt = 0; attempt <= maxRetries; attempt++) { // Render backend goes to sleep after 15 mins. Retrying here because cold starts take forever to wake up
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          // Server confirmed: token is valid
          return { type: 'signed-in', user: await response.json() };
        } else if (response.status === 401) {
          // Server confirmed: token is invalid — clear it
          localStorage.removeItem('lfs_jwt_token');
          return { type: 'invalid' };
        }
        // 403, 5xx — server might be waking up, retry
        console.warn(`Session verify attempt ${attempt + 1}/${maxRetries + 1}: status ${response.status}`);
      } catch (error) {
        // Network error — server is likely still spinning up
        console.warn(`Session verify attempt ${attempt + 1}/${maxRetries + 1}: ${error.message}`);
      }

      // Wait before next retry (linear backoff: 4s, 8s, 12s, 16s, 20s)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }

    // All retries exhausted — backend seems unreachable
    // Return null so the caller knows to keep the optimistic state
    return null;
  },

  // Create or get guest session (requires backend — no local fallback)
  async createGuestSession() {
    let guestId = this.getGuestId();
    if (guestId) {
      return { type: 'guest', guestId };
    }

    const response = await fetch(`${API_BASE}/session/guest`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to create guest session: server returned ${response.status}`);
    }

    const data = await response.json();
    guestId = data.guestToken;
    this.setGuestId(guestId);
    return { type: 'guest', guestId };
  },

  // Sign in with email/password
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, { //Calls the backend /api/auth/login to login the user.
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      if (data.token) {
        localStorage.setItem('lfs_jwt_token', data.token);
      }
      // Clear any guest session
      this.clearGuestId();
      return { success: true, user: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Register new account
  async register(username, email, password, passwordConfirm) {
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, passwordConfirm }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const data = await response.json();
      if (data.token) {
        localStorage.setItem('lfs_jwt_token', data.token);
      }
      // Clear any guest session
      this.clearGuestId();
      return { success: true, user: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Sign out
  async logout() {
    try {
      const token = localStorage.getItem('lfs_jwt_token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers,
      });
    } catch (error) {
      console.error('Error logging out:', error);
    }
    this.clearGuestId();
    localStorage.removeItem('lfs_jwt_token');
  },

  // Get current user limits
  async getLimits() {
    try {
      const guestId = this.getGuestId();
      const url = guestId
        ? `${API_BASE}/limits/current?guestToken=${encodeURIComponent(guestId)}` //calls backend /limits/current with guest token if available
        : `${API_BASE}/limits/current`; // Calls backend /limits/current 

      const headers = {};
      const token = localStorage.getItem('lfs_jwt_token'); //gets locally stored token for extraction.
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      if (response.ok) {
        const data = await response.json();
        // Transform API response to expected frontend format
        return {
          maxFileSize: data.fileSizeLimitMb * 1024 * 1024, // Convert MB to bytes
          maxFiles: data.maxUploads,
          maxStorageBytes: data.maxStorageMb * 1024 * 1024, // Convert MB to bytes
          maxDownloads: data.maxDownloads,
          userType: data.userType,
        };
      }
    } catch (error) {
      console.error('Error fetching limits:', error);
    }
    // Return appropriate default limits based on current auth state
    if (localStorage.getItem('lfs_jwt_token')) {
      // Signed-in user — use registered defaults so uploads aren't blocked
      return { maxFileSize: 100 * 1024 * 1024, maxFiles: 100, maxStorageBytes: 10000 * 1024 * 1024, maxDownloads: 1000, userType: 'REGISTERED' };
    }
    // Guest/new user — use restrictive guest defaults
    return { maxFileSize: 5 * 1024 * 1024, maxFiles: 10, maxStorageBytes: 500 * 1024 * 1024, maxDownloads: 50, userType: 'GUEST' };
  },

  // Guest ID management
  getGuestId() {
    try {
      return localStorage.getItem(GUEST_ID_KEY); //retrieves guest ID from local storage.
    } catch {
      console.error('localStorage not available');
      return null;
    }
  },

  //called when given Guest ID needed to be set.
  //this sets the GUEST_ID_KEY in local storage
  setGuestId(guestId) {
    try {
      localStorage.setItem(GUEST_ID_KEY, guestId);
    } catch {
      console.error('localStorage not available');
    }
  },

  //called when Guest ID is no longer needed.
  //this clears the GUEST_ID_KEY from local storage
  clearGuestId() {
    try {
      localStorage.removeItem(GUEST_ID_KEY);
    } catch {
      console.error('localStorage not available');
    }
  },

  // Welcome modal state, used by App.jsx
  isWelcomeSeen() { //checks if WELCOME_SEEN_KEY is present in local storage
    try {
      return localStorage.getItem(WELCOME_SEEN_KEY) === 'true';
    } catch {
      return false;
    }
  },

  setWelcomeSeen() { //sets WELCOME_SEEN_KEY in local storage to true
    try {
      localStorage.setItem(WELCOME_SEEN_KEY, 'true');
    } catch {
      console.error('localStorage not available');
    }
  },

  resetWelcome() { //resets the welcome modal by removing the WELCOME_SEEN_KEY from local storage
    try {
      localStorage.removeItem(WELCOME_SEEN_KEY);
    } catch {
      console.error('localStorage not available');
    }
  },
};
