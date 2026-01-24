import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from './XalaUI';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'nb' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="h-10 w-10 sm:h-11 sm:w-11 rounded-lg hover:bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      title={i18n.language === 'en' ? 'Switch to Norwegian' : 'Bytt til engelsk'}
    >
      <Globe size={18} className="sm:w-5 sm:h-5" />
      <span className="ml-1 text-xs font-medium uppercase hidden sm:inline">
        {i18n.language === 'en' ? 'EN' : 'NO'}
      </span>
    </button>
  );
};

