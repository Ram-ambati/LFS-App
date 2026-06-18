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
      const response = await fetch(`${API_BASE}/auth/me`, {
        method: 'GET',
        credentials: 'include', // Include httpOnly cookies
      });
      if (response.ok) {
        return { type: 'signed-in', user: await response.json() };
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }

    // Check if guest session exists
    const guestId = this.getGuestId();
    if (guestId) {
      return { type: 'guest', guestId };
    }

    return { type: 'new' };
  },

  // Create or get guest session
  async createGuestSession() {
    try {
      let guestId = this.getGuestId();
      if (!guestId) {
        const response = await fetch(`${API_BASE}/session/guest`, {
          method: 'GET',
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          guestId = data.guestId;
          this.setGuestId(guestId);
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

      const user = await response.json();
      // Clear any guest session
      this.clearGuestId();
      return { success: true, user };
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

      const user = await response.json();
      // Clear any guest session
      this.clearGuestId();
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Sign out
  async logout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error logging out:', error);
    }
    this.clearGuestId();
  },

  // Get current user limits
  async getLimits() {
    try {
      const response = await fetch(`${API_BASE}/limits/current`, {
        method: 'GET',
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
    } catch (e) {
      console.error('localStorage not available');
      return null;
    }
  },

  setGuestId(guestId) {
    try {
      localStorage.setItem(GUEST_ID_KEY, guestId);
    } catch (e) {
      console.error('localStorage not available');
    }
  },

  clearGuestId() {
    try {
      localStorage.removeItem(GUEST_ID_KEY);
    } catch (e) {
      console.error('localStorage not available');
    }
  },

  // Welcome modal state
  isWelcomeSeen() {
    try {
      return localStorage.getItem(WELCOME_SEEN_KEY) === 'true';
    } catch (e) {
      return false;
    }
  },

  setWelcomeSeen() {
    try {
      localStorage.setItem(WELCOME_SEEN_KEY, 'true');
    } catch (e) {
      console.error('localStorage not available');
    }
  },

  resetWelcome() {
    try {
      localStorage.removeItem(WELCOME_SEEN_KEY);
    } catch (e) {
      console.error('localStorage not available');
    }
  },
};
