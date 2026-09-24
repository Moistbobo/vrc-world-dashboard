import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ja from './locales/ja.json';

const savedLang = (() => {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('i18nextLng');
  } catch {
    return null;
  }
})();

i18next.use(initReactI18next).init({
  lng: savedLang || 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  resources: {
    en: { translation: en },
    ja: { translation: ja },
  },
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18next.language;
}

export default i18next;
