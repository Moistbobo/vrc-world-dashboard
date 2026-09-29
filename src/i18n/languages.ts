export const SUPPORTED_LANGUAGES = ['en', 'ja'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function resolveLanguage(saved: string | null | undefined): SupportedLanguage {
  return SUPPORTED_LANGUAGES.find((code) => code === saved) ?? 'en';
}
