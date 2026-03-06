'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Language } from '@/lib/firestore/internationalization';
import { getAllLanguages } from '@/lib/firestore/internationalization_db';
import { getTranslationsByLanguage } from '@/lib/firestore/translations_db';
import { DEFAULT_TRANSLATION_KEYS } from '@/lib/firestore/translations';
import { ENGLISH_TRANSLATION_KEYS } from '@/lib/firestore/translations_en';

interface LanguageContextType {
  currentLanguage: Language | null;
  languages: Language[];
  translations: Record<string, string>;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  isLoading: boolean;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
  defaultLanguageCode?: string;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
  defaultLanguageCode = 'ar'
}) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>(DEFAULT_TRANSLATION_KEYS);
  const [isLoading, setIsLoading] = useState(true);

  // Load translations when language changes
  const setLanguage = async (language: Language) => {
    try {
      setIsLoading(true);
      const translationsData = await getTranslationsByLanguage(language.code);

      // Determine the base dictionary based on language code
      const baseDictionary = language.code === 'en' ? ENGLISH_TRANSLATION_KEYS : DEFAULT_TRANSLATION_KEYS;

      // Merge with default translations (fallback)
      setTranslations({
        ...baseDictionary,
        ...translationsData,
      });

      setCurrentLanguage(language);

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('preferredLanguage', language.code);
      }

      // Update document direction for RTL
      if (typeof document !== 'undefined') {
        document.documentElement.dir = language.isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = language.code;
      }
    } catch {
      // Failed to load translations
    } finally {
      setIsLoading(false);
    }
  };

  // Translation function
  const t = (key: string, params?: Record<string, string | number>): string => {
    let translation = translations[key] || key;

    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        translation = translation.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(value));
      });
    }

    return translation;
  };

  // Load languages on mount
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        let allLanguages = await getAllLanguages(true); // Only active languages

        // Ensure Arabic and English are always available for easy switching without Firestore
        if (!allLanguages.some(l => l.code === 'ar')) {
          allLanguages.push({
            id: 'default-ar',
            name: 'Arabic',
            nativeName: 'العربية',
            code: 'ar',
            isRTL: true,
            isActive: true,
            flag: '🇦🇪',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        }

        if (!allLanguages.some(l => l.code === 'en')) {
          allLanguages.push({
            id: 'default-en',
            name: 'English',
            nativeName: 'English',
            code: 'en',
            isRTL: false,
            isActive: true,
            flag: '🇬🇧',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        }

        setLanguages(allLanguages);

        // Check for saved preference first
        if (typeof window !== 'undefined') {
          const savedLanguageCode = localStorage.getItem('preferredLanguage');
          if (savedLanguageCode && allLanguages.length > 0) {
            const savedLanguage = allLanguages.find(lang => lang.code === savedLanguageCode);
            if (savedLanguage) {
              await setLanguage(savedLanguage);
              return;
            }
          }
        }

        // Set default language
        if (allLanguages.length > 0) {
          const defaultLang = allLanguages.find(lang => lang.code === defaultLanguageCode) || allLanguages[0];
          if (defaultLang) {
            await setLanguage(defaultLang);
          }
        }
      } catch {
        // Failed to load languages
        setIsLoading(false);
      }
    };

    loadLanguages();
  }, [defaultLanguageCode]);

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        languages,
        translations,
        setLanguage,
        t,
        isLoading,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

