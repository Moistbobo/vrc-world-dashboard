import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ja from './locales/ja.json';
import { resolveLanguage } from './languages';

const savedLang = (() => {
  try {
    return localStorage.getItem('i18nextLng');
  } catch {
    return null;
  }
})();

i18next.use(initReactI18next).init({
  lng: resolveLanguage(savedLang),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  resources: {
    en: { translation: en },
    ja: { translation: ja },
  },
});

function applyDocumentLanguage(lng: string | null | undefined) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = resolveLanguage(lng);
  }
}

applyDocumentLanguage(i18next.language);
i18next.on('languageChanged', (lng) => applyDocumentLanguage(lng));

export default i18next;
