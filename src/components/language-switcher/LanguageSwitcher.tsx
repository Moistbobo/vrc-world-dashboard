import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../i18n/languages';

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  ja: '日本語',
};

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    try {
      localStorage.setItem('i18nextLng', code);
    } catch {
      // ignore storage errors
    }
  };

  return (
    <select
      id="language"
      value={i18n.language}
      onChange={(e) => handleChange(e.target.value)}
      aria-label={t('settings.language')}
      className="input w-full"
    >
      {SUPPORTED_LANGUAGES.map((code) => (
        <option key={code} value={code} lang={code}>
          {LANGUAGE_LABELS[code]}
        </option>
      ))}
    </select>
  );
}
