import { useTranslation } from 'react-i18next';
import { LANGUAGE_COOKIE } from '../../i18n/constants';
import { useRefresh } from '../../lib/navigation';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const refresh = useRefresh();

  const handleChange = (code: string) => {
    void i18n.changeLanguage(code);
    document.documentElement.lang = code;
    try {
      localStorage.setItem(LANGUAGE_COOKIE, code);
    } catch {
      // ignore storage errors
    }
    document.cookie = `${LANGUAGE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    refresh();
  };

  return (
    <select
      id="language"
      value={i18n.language}
      onChange={(e) => handleChange(e.target.value)}
      className="input w-full"
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}
