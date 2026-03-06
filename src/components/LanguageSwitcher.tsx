'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '@/lib/firestore/internationalization';

const LanguageSwitcher: React.FC = () => {
  const { currentLanguage, languages, setLanguage, isLoading } = useLanguage();
  const isRTL = currentLanguage?.isRTL || false;
  const [isOpen, setIsOpen] = useState(false);

  // Debug: Log state
  React.useEffect(() => {
    // LanguageSwitcher - isLoading: isLoading, languages: languages.length, currentLanguage: currentLanguage
  }, [isLoading, languages, currentLanguage]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-gray-50">
        <div className="animate-pulse w-20 h-4 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // If no languages, still show switcher with default
  if (languages.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-gray-50">
        <span className="text-sm font-medium text-gray-500">🌐 EN</span>
      </div>
    );
  }

  const handleLanguageChange = async (language: Language) => {
    await setLanguage(language);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        aria-label="تغيير اللغة"
      >
        {currentLanguage?.flag && (
          currentLanguage.flag.startsWith('http') ? (
            <Image
              src={currentLanguage.flag}
              alt={`${currentLanguage.name} flag`}
              width={20}
              height={20}
              className="w-5 h-5 rounded object-cover"
              unoptimized
            />
          ) : (
            <span className="text-lg">{currentLanguage.flag}</span>
          )
        )}
        <span className="text-sm font-medium">
          {currentLanguage?.nativeName || currentLanguage?.name || 'اللغة'}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 end-0 z-20 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[180px] max-h-64 overflow-y-auto">
            {languages.map((language) => (
              <button
                key={language.id || language.code}
                onClick={() => handleLanguageChange(language)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 ${isRTL ? 'text-right' : 'text-left'} hover:bg-gray-50 transition-colors ${currentLanguage?.code === language.code ? 'bg-blue-50 text-blue-600' : ''
                  }`}
              >
                {language.flag && (
                  language.flag.startsWith('http') ? (
                    <Image
                      src={language.flag}
                      alt={`${language.name} flag`}
                      width={20}
                      height={20}
                      className="w-5 h-5 rounded object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-lg">{language.flag}</span>
                  )
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{language.nativeName}</span>
                  <span className="text-xs text-gray-500">{language.name}</span>
                </div>
                {currentLanguage?.code === language.code && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4 ms-auto"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;

