import React, { createContext, useContext, useState, useCallback } from 'react';
import { getLang, setLang as persistLang } from '@/lib/i18n';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(getLang());

  const setLang = useCallback((l) => {
    persistLang(l);
    setLangState(l);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => useContext(LanguageContext);
