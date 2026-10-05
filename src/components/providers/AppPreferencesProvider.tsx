'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language, translations } from '@/lib/i18n';
import { triggerHaptic } from '@/lib/haptics';

export type AppTheme = 'steam' | 'amoled';

interface PreferencesContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  t: (typeof translations)['ru'];
}

const PreferencesContext = createContext<PreferencesContextType>({
  language: 'ru',
  setLanguage: () => {},
  isPrivacyMode: false,
  togglePrivacyMode: () => {},
  theme: 'steam',
  setTheme: () => {},
  t: translations.ru,
});

export const usePreferences = () => useContext(PreferencesContext);

export const AppPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('ru');
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(false);
  const [theme, setThemeState] = useState<AppTheme>('steam');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('sinkdev_pref_lang') as Language;
      if (savedLang === 'ru' || savedLang === 'en') {
        setLanguageState(savedLang);
      } else {
        const isRu = navigator.language?.toLowerCase().startsWith('ru');
        setLanguageState(isRu ? 'ru' : 'en');
      }

      const savedPrivacy = localStorage.getItem('sinkdev_pref_privacy');
      if (savedPrivacy !== null) {
        setIsPrivacyMode(savedPrivacy === 'true');
      }

      const savedTheme = localStorage.getItem('sinkdev_pref_theme') as AppTheme;
      if (savedTheme === 'steam' || savedTheme === 'amoled') {
        setThemeState(savedTheme);
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    triggerHaptic('light');
    if (typeof window !== 'undefined') {
      localStorage.setItem('sinkdev_pref_lang', lang);
    }
  };

  const togglePrivacyMode = () => {
    setIsPrivacyMode(prev => {
      const next = !prev;
      triggerHaptic('medium');
      if (typeof window !== 'undefined') {
        localStorage.setItem('sinkdev_pref_privacy', String(next));
      }
      return next;
    });
  };

  const setTheme = (t: AppTheme) => {
    setThemeState(t);
    triggerHaptic('light');
    if (typeof window !== 'undefined') {
      localStorage.setItem('sinkdev_pref_theme', t);
    }
  };

  const t = translations[language];

  return (
    <PreferencesContext.Provider
      value={{
        language,
        setLanguage,
        isPrivacyMode,
        togglePrivacyMode,
        theme,
        setTheme,
        t,
      }}
    >
      <div className={`h-full flex flex-col ${theme === 'amoled' ? 'bg-[#000000]' : 'bg-[#171a21]'}`}>
        {children}
      </div>
    </PreferencesContext.Provider>
  );
};
