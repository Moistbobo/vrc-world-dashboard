import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ja from './locales/ja.json';
import { normalizeLanguage, type SupportedLanguage } from './constants';

export { normalizeLanguage, SUPPORTED_LANGUAGES } from './constants';
export type { SupportedLanguage } from './constants';

const initOptions = {
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  resources: {
    en: { translation: en },
    ja: { translation: ja },
  },
} as const;

// A fresh instance per request avoids a shared-language race between concurrent
// server renders that carry different i18nextLng cookies.
export function createI18n(lang: SupportedLanguage): I18nInstance {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({ ...initOptions, lng: lang });
  return instance;
}

// Initializes the shared singleton that react-i18next falls back to when no
// I18nextProvider is present (unit tests render views directly).
export function initI18n(lang: string) {
  const normalized = normalizeLanguage(lang);
  if (!i18next.isInitialized) {
    void i18next.use(initReactI18next).init({ ...initOptions, lng: normalized });
  } else if (i18next.language !== normalized) {
    void i18next.changeLanguage(normalized);
  }
  return i18next;
}

export default i18next;
