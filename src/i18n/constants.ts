export const LANGUAGE_COOKIE = 'i18nextLng';

export const SUPPORTED_LANGUAGES = ['en', 'ja'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function normalizeLanguage(value: string | undefined | null): SupportedLanguage {
  return value === 'ja' ? 'ja' : 'en';
}
