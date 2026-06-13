import { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    type: 'loading', // 'loading', 'new', 'guest', 'signed-in'
    user: null,
    guestId: null,
    limits: null,
    error: null,
  });

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const session = await authService.checkSession();
      
      if (session.type === 'signed-in') {
        const limits = await authService.getLimits();
        setAuthState({
          type: 'signed-in',
          user: session.user,
          guestId: null,
          limits,
          error: null,
        });
      } else if (session.type === 'guest') {
        const limits = await authService.getLimits();
        setAuthState({
          type: 'guest',
          user: null,
          guestId: session.guestId,
          limits,
          error: null,
        });
      } else {
        setAuthState({
          type: 'new',
          user: null,
          guestId: null,
          limits: null,
          error: null,
        });
      }
    };

    initializeAuth();
  }, []);

  const startAsGuest = useCallback(async () => {
    const session = await authService.createGuestSession();
    const limits = await authService.getLimits();
    authService.setWelcomeSeen();
    setAuthState({
      type: 'guest',
      user: null,
      guestId: session.guestId,
      limits,
      error: null,
    });
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await authService.login(email, password);
    if (result.success) {
      const limits = await authService.getLimits();
      authService.setWelcomeSeen();
      setAuthState({
        type: 'signed-in',
        user: result.user,
        guestId: null,
        limits,
        error: null,
      });
      return { success: true };
    } else {
      setAuthState((prev) => ({ ...prev, error: result.error }));
      return { success: false, error: result.error };
    }
  }, []);

  const register = useCallback(async (username, email, password, passwordConfirm) => {
    const result = await authService.register(username, email, password, passwordConfirm);
    if (result.success) {
      const limits = await authService.getLimits();
      authService.setWelcomeSeen();
      setAuthState({
        type: 'signed-in',
        user: result.user,
        guestId: null,
        limits,
        error: null,
      });
      return { success: true };
    } else {
      setAuthState((prev) => ({ ...prev, error: result.error }));
      return { success: false, error: result.error };
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setAuthState({
      type: 'new',
      user: null,
      guestId: null,
      limits: null,
      error: null,
    });
  }, []);

  const clearError = useCallback(() => {
    setAuthState((prev) => ({ ...prev, error: null }));
  }, []);

  const value = {
    ...authState,
    startAsGuest,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
