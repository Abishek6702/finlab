import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from './authContextBase';
import { getAccessToken, setAccessToken, clearAccessToken } from '../api/tokenStore';
import { useTheme } from '../hooks/useTheme';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9003/api';

export function AuthProvider({ children }) {
  const { setPreference } = useTheme();
  const [user, setUser] = useState(null);
  const [accessToken, setTokenState] = useState(getAccessToken());
  const [isLoading, setIsLoading] = useState(true);

  // Directly sets the active session and token 'save_future'
  const setAuthSession = useCallback((token, userData) => {
    setAccessToken(token);
    setTokenState(token);
    setUser(userData);
    if (userData) setPreference(userData.theme === 'dark' ? 'dark' : 'light');
  }, [setPreference]);

  // Fetch current user from /auth/me
  const fetchCurrentUser = useCallback(async (token) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      if (res?.data?.data) {
        setUser(res.data.data);
        setPreference(res.data.data.theme === 'dark' ? 'dark' : 'light');
        return res.data.data;
      }
    } catch {
      setUser(null);
    }
  }, [setPreference]);

  const updateProfile = useCallback(async (changes) => {
    const token = getAccessToken();
    const response = await axios.patch(`${API_BASE_URL}/auth/profile`, changes, {
      withCredentials: true,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const updatedUser = response?.data?.data;
    if (updatedUser) {
      setUser(updatedUser);
      setPreference(updatedUser.theme === 'dark' ? 'dark' : 'light');
    }
    return updatedUser;
  }, [setPreference]);

  const completeOnboarding = useCallback(async () => {
    const token = getAccessToken();
    const response = await axios.post(`${API_BASE_URL}/auth/onboarding/complete`, {}, {
      withCredentials: true,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const updatedUser = response?.data?.data;
    if (updatedUser) setUser(updatedUser);
    return updatedUser;
  }, []);

  // Refresh access token via HttpOnly cookie
  const refreshAccessToken = useCallback(async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
      const newToken = res?.data?.data?.accessToken;
      if (newToken) {
        setAccessToken(newToken);
        setTokenState(newToken);
        const currentUser = await fetchCurrentUser(newToken);
        return { accessToken: newToken, user: currentUser };
      }
      throw new Error('Refresh failed');
    } catch (err) {
      clearAccessToken();
      setTokenState(null);
      setUser(null);
      throw err;
    }
  }, [fetchCurrentUser]);

  // Initial application mount: Attempt refresh using HttpOnly cookie or validate stored token
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const storedToken = getAccessToken();
        if (storedToken) {
          try {
            const userData = await fetchCurrentUser(storedToken);
            if (userData && isMounted) {
              setTokenState(storedToken);
              setIsLoading(false);
              return;
            }
          } catch {
            // Token expired or invalid, proceed to refresh
          }
        }
        await refreshAccessToken();
      } catch {
        // Unauthenticated session
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    const handleSessionExpired = () => {
      clearAccessToken();
      setTokenState(null);
      setUser(null);
    };

    const handleStorageChange = (e) => {
      if (e.key === 'save_future' && !e.newValue) {
        setTokenState(null);
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, [fetchCurrentUser, refreshAccessToken]);

  // Logout (Current Device)
  const logout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true });
    } catch (err) {
      console.warn('Backend logout encountered error:', err.message);
    } finally {
      clearAccessToken();
      setTokenState(null);
      setUser(null);
    }
  };

  // Logout All Devices
  const logoutAll = async () => {
    try {
      const token = getAccessToken();
      await axios.post(
        `${API_BASE_URL}/auth/logout-all`,
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        }
      );
    } catch (err) {
      console.warn('Backend logout-all encountered error:', err.message);
    } finally {
      clearAccessToken();
      setTokenState(null);
      setUser(null);
    }
  };

  const value = {
    user,
    accessToken,
    isAuthenticated: Boolean(accessToken && user),
    isLoading,
    setAuthSession,
    logout,
    logoutAll,
    refreshAccessToken,
    fetchCurrentUser,
    updateProfile,
    completeOnboarding,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
