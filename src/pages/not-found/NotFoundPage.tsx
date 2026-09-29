import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle';

export function NotFoundPage() {
  const { t } = useTranslation();
  usePageTitle(t('notFound.title'));

  return (
    <div className="space-y-4 py-12 text-center">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('notFound.title')}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">{t('notFound.description')}</p>
      <Link to="/" className="btn-primary inline-flex text-sm">
        {t('notFound.backHome')}
      </Link>
    </div>
  );
}
