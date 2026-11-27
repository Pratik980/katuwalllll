import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api, { refreshCsrfToken } from '../api/axios';
import { setCsrfToken } from '../api/csrfToken';
import { useLanguage } from './LanguageContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState('');
  const { t } = useLanguage();
  const tRef = useRef(t);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const refreshUser = useCallback(async () => {
    const response = await api.get('/auth/me');
    setUser(response.data.user);
    return response.data.user;
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        await refreshCsrfToken();
        const response = await api.get('/auth/me');
        if (active) setUser(response.data.user);
      } catch (error) {
        if (active && error.response?.status !== 401) {
          setInitializationError(error.response?.data?.message || tRef.current('auth_connect_failed'));
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
      await api.post('/auth/logout', {}, { _skipErrorToast: true });
    } catch (error) {
      if (error.response?.status !== 401) {
        toast.error(error.response?.data?.message || t('auth_signout_failed'));
      }
    } finally {
      setCsrfToken('');
      setUser(null);
      delete window.__katuwalMemberDraft__;
      localStorage.removeItem('memberDraft');
      localStorage.removeItem('memberDraftPhotos');
    }
  }, [t]);

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
