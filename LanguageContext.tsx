import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, Translation, translations } from './i18n';

interface LanguageContextType {
  lang: Language;
  t: Translation;
  setLang: (lang: Language) => void;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'fr',
  t: translations.fr,
  setLang: () => {},
  isRTL: false,
});

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('fr');

  // Charger la langue sauvegardée
  useEffect(() => {
    AsyncStorage.getItem('goalpulse_lang').then((saved) => {
      if (saved && ['fr', 'en', 'ar'].includes(saved)) {
        setLangState(saved as Language);
      }
    });
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    AsyncStorage.setItem('goalpulse_lang', newLang).catch(() => {});
  };

  const value: LanguageContextType = {
    lang,
    t: translations[lang],
    setLang,
    isRTL: lang === 'ar',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
