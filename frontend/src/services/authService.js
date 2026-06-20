/**
 * Auth Service - Handles all authentication API calls
 * Assumes backend endpoints:
 * - GET /api/auth/me - Get current user session
 * - POST /api/auth/login - Sign in
 * - POST /api/auth/register - Create account
 * - POST /api/auth/logout - Sign out
 * - GET /api/session/guest - Create/get guest session
 * - GET /api/limits/current - Get current user limits
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Guest Session Management
const GUEST_ID_KEY = 'lfs_guest_id';
const WELCOME_SEEN_KEY = 'lfs_welcome_seen';

export const authService = {
  // Check current auth status
  async checkSession() {
    try {
      const token = localStorage.getItem('lfs_jwt_token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/auth/me`, {
        method: 'GET',
        headers,
        credentials: 'include', // Include httpOnly cookies
      });
      if (response.ok) {
        return { type: 'signed-in', user: await response.json() };
      } else if (response.status === 401 && token) {
        localStorage.removeItem('lfs_jwt_token');
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }

    // Check if guest session exists and validate it
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
        // Keep guest token on network/server errors to avoid breaking offline capability
        return { type: 'guest', guestId };
      }
      this.clearGuestId();
    }

    // If welcome modal has already been seen, auto-generate guest session so they don't get 401s
    if (this.isWelcomeSeen()) {
      try {
        const session = await this.createGuestSession();
        return { type: 'guest', guestId: session.guestId };
      } catch (error) {
        console.error('Error auto-creating guest session:', error);
      }
    }

    return { type: 'new' };
  },

  // Create or get guest session
  async createGuestSession() {
    try {
      let guestId = this.getGuestId();
      if (!guestId) {
        const response = await fetch(`${API_BASE}/session/guest`, {
          method: 'POST',
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          guestId = data.guestToken;
          this.setGuestId(guestId);
        } else {
          throw new Error(`Server returned status ${response.status}`);
        }
      }
      return { type: 'guest', guestId };
    } catch (error) {
      console.error('Error creating guest session:', error);
      // Fallback: create local guest ID if backend fails
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.setGuestId(guestId);
      return { type: 'guest', guestId };
    }
  },

  // Sign in with email/password
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Store auth in httpOnly cookie
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
        credentials: 'include',
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
        credentials: 'include',
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
        ? `${API_BASE}/limits/current?guestToken=${encodeURIComponent(guestId)}`
        : `${API_BASE}/limits/current`;

      const headers = {};
      const token = localStorage.getItem('lfs_jwt_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include',
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
    // Return default guest limits
    return { maxFileSize: 5 * 1024 * 1024, maxFiles: 10 }; // 5MB, 10 files
  },

  // Guest ID management
  getGuestId() {
    try {
      return localStorage.getItem(GUEST_ID_KEY);
    } catch {
      console.error('localStorage not available');
      return null;
    }
  },

  setGuestId(guestId) {
    try {
      localStorage.setItem(GUEST_ID_KEY, guestId);
    } catch {
      console.error('localStorage not available');
    }
  },

  clearGuestId() {
    try {
      localStorage.removeItem(GUEST_ID_KEY);
    } catch {
      console.error('localStorage not available');
    }
  },

  // Welcome modal state
  isWelcomeSeen() {
    try {
      return localStorage.getItem(WELCOME_SEEN_KEY) === 'true';
    } catch {
      return false;
    }
  },

  setWelcomeSeen() {
    try {
      localStorage.setItem(WELCOME_SEEN_KEY, 'true');
    } catch {
      console.error('localStorage not available');
    }
  },

  resetWelcome() {
    try {
      localStorage.removeItem(WELCOME_SEEN_KEY);
    } catch {
      console.error('localStorage not available');
    }
  },
};
