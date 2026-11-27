// src/context/LanguageContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { translations } from '../translations';

export const LANGUAGES = { EN: 'en', NE: 'ne' };

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    const initial = saved && ['en', 'ne'].includes(saved) ? saved : 'en';
    document.documentElement.lang = initial;
    return initial;
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key, vars = {}) => {
    if (!key) return key;

    const langData = translations[language];
    const fallbackData = translations.en;
    let value = key;

    if (langData && langData[key] !== undefined && langData[key] !== '') {
      value = langData[key];
    } else if (fallbackData && fallbackData[key] !== undefined && fallbackData[key] !== '') {
      value = fallbackData[key];
    }

    return value.replace(/\{(\w+)\}/g, (match, name) => (
      vars[name] !== undefined ? String(vars[name]) : match
    ));
  }, [language]);

  const changeLanguage = (lang) => {
    if (!Object.values(LANGUAGES).includes(lang)) return false;
    setLanguage(lang);
    localStorage.setItem('language', lang);
    return true;
  };

  return (
    <LanguageContext.Provider value={{ language, LANGUAGES, setLanguage: changeLanguage, t }}>
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