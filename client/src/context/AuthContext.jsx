import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { setCsrfToken } from '../api/csrfToken';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState('');

  const refreshUser = useCallback(async () => {
    const response = await api.get('/auth/me');
    setUser(response.data.user);
    return response.data.user;
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const csrf = await api.get('/auth/csrf');
        setCsrfToken(csrf.data.csrfToken);
        const response = await api.get('/auth/me');
        if (active) setUser(response.data.user);
      } catch (error) {
        if (active && error.response?.status !== 401) {
          setInitializationError(error.response?.data?.message || 'Unable to connect to the account service.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    initialize();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    setCsrfToken(response.data.csrfToken);
    setUser(response.data.user);
    return response.data.user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      if (error.response?.status !== 401) throw error;
    }
    setCsrfToken('');
    setUser(null);
  }, []);

  const updateUser = useCallback((nextUser) => setUser(nextUser), []);
  const value = useMemo(() => ({
    user,
    loading,
    initializationError,
    signIn,
    signOut,
    refreshUser,
    updateUser,
  }), [user, loading, initializationError, signIn, signOut, refreshUser, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
};
