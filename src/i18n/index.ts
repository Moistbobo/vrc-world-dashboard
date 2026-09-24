import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ja from './locales/ja.json';

export function initI18n(lang: string) {
  if (i18next.isInitialized) {
    if (lang && i18next.language !== lang) {
      void i18next.changeLanguage(lang);
    }
  } else {
    void i18next.use(initReactI18next).init({
      lng: lang || 'en',
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
      resources: {
        en: { translation: en },
        ja: { translation: ja },
      },
    });
  }

  if (typeof document !== 'undefined') {
    document.documentElement.lang = i18next.language;
  }

  return i18next;
}

export default i18next;
