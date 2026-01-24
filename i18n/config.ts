import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en.json';
import nbTranslations from './locales/nb.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations
      },
      nb: {
        translation: nbTranslations
      }
    },
    lng: localStorage.getItem('language') || 'en', // Default to English, or use saved preference
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;

