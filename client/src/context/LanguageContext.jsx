// src/context/LanguageContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import { translations } from '../translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const { user, updateUser } = useAuth();
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem('language');
    if (saved && ['en', 'ne'].includes(saved)) {
      return saved;
    }
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (user?.preferredLanguage && ['en', 'ne'].includes(user.preferredLanguage)) {
      setLanguageState(user.preferredLanguage);
    }
  }, [user?.id, user?.preferredLanguage]);

  const t = (key) => {
    if (!key) return key;
    
    const langData = translations[language];
    const fallbackData = translations.en;
    
    if (langData && langData[key] !== undefined && langData[key] !== '') {
      return langData[key];
    }
    
    if (fallbackData && fallbackData[key] !== undefined && fallbackData[key] !== '') {
      return fallbackData[key];
    }
    
    return key;
  };

  const changeLanguage = useCallback(async (lang) => {
    if (!['en', 'ne'].includes(lang)) return false;
    setLanguageState(lang);
    if (user && user.preferredLanguage !== lang) {
      try {
        const response = await api.put('/auth/me', { preferredLanguage: lang });
        updateUser(response.data.user);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Could not save your language preference.');
        return false;
      }
    }
    return true;
  }, [user, updateUser]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;