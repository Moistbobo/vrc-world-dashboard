import { useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { BellOff, Eye, EyeOff, KeyRound, Languages, LayoutGrid, MousePointerClick } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { LanguageSwitcher } from '../../components/language-switcher';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useWorldsPreferences } from '../../hooks/useWorldsPreferences';
import { useListsPreferences } from '../../hooks/useListsPreferences';
import { useMe } from '../../hooks/useApi';
import { clearStoredApiToken, getStoredApiToken, setStoredApiToken } from '../../utils/tokenStorage';
import { getAppVersion } from '../../config/version';

export function SettingsPage() {
  const { t } = useTranslation();
  usePageTitle(t('settings.title'));
  const { viewMode, setViewMode, scrollMode, setScrollMode } = useWorldsPreferences();
  const { skipRemoveWorldConfirmation, setSkipRemoveWorldConfirmation } = useListsPreferences();
  const queryClient = useQueryClient();
  const { data: me, isError: meError, isPending: mePending } = useMe();
  const [token, setToken] = useState(getStoredApiToken);
  const [savedToken, setSavedToken] = useState(getStoredApiToken);
  const [showToken, setShowToken] = useState(false);

  function handleTokenChange(e: ChangeEvent<HTMLInputElement>) {
    setToken(e.target.value);
  }

  function applyToken(next: string) {
    const trimmed = next.trim();
    setToken(trimmed);
    setSavedToken(trimmed);
    queryClient.removeQueries({ queryKey: ['me'] });
    if (trimmed) {
      setStoredApiToken(trimmed);
      queryClient.setQueryData(['identity', 'requested'], true);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } else {
      clearStoredApiToken();
      queryClient.setQueryData(['identity', 'requested'], false);
    }
  }

  function handleApply() {
    applyToken(token);
  }

  let statusText: string;
  if (savedToken && me) {
    statusText = t('settings.apiTokenConnected', { name: me.name, role: me.role });
  } else if (savedToken && meError) {
    statusText = t('settings.apiTokenInvalid');
  } else if (savedToken && mePending) {
    statusText = t('settings.apiTokenCustom');
  } else {
    statusText = t('settings.apiTokenDefault');
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('settings.subtitle')}
        </p>
      </div>

      <div className="card p-5 space-y-5">
        <div>
          <label
            htmlFor="language"
            className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-200"
          >
            <Languages className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            {t('settings.language')}
          </label>
          <LanguageSwitcher />
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t('settings.languageHint')}</p>
        </div>

        <div>
          <label htmlFor="view-mode" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
            <LayoutGrid className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            {t('settings.viewMode')}
          </label>
          <select
            id="view-mode"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'grid' | 'list')}
            className="input w-full"
          >
            <option value="grid">{t('settings.viewModeGrid')}</option>
            <option value="list">{t('settings.viewModeList')}</option>
          </select>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t('settings.viewModeHint')}</p>
        </div>

        <div>
          <label htmlFor="scroll-mode" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
            <MousePointerClick className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            {t('settings.scrollMode')}
          </label>
          <select
            id="scroll-mode"
            value={scrollMode}
            onChange={(e) => setScrollMode(e.target.value as 'infinite' | 'pagination')}
            className="input w-full"
          >
            <option value="infinite">{t('settings.scrollModeInfinite')}</option>
            <option value="pagination">{t('settings.scrollModePagination')}</option>
          </select>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t('settings.scrollModeHint')}</p>
        </div>
        <div className="flex items-start gap-3">
          <BellOff className="mt-0.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
          <div className="flex-1">
            <label htmlFor="skip-remove-confirm" className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
              <input
                id="skip-remove-confirm"
                type="checkbox"
                checked={skipRemoveWorldConfirmation}
                onChange={(e) => setSkipRemoveWorldConfirmation(e.target.checked)}
                className="h-6 w-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600"
              />
              {t('settings.skipRemoveWorldConfirmation')}
            </label>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t('settings.skipRemoveWorldConfirmationHint')}</p>
          </div>
        </div>
      </div>

      <h2 className="mt-6 text-sm font-semibold text-slate-900 dark:text-white">
        {t('settings.advanced')}
      </h2>
      <div className="card mt-2 p-5">
        <div>
          <label htmlFor="api-token" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
            <KeyRound className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            {t('settings.apiToken')}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                id="api-token"
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={handleTokenChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApply();
                  }
                }}
                className="input w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                aria-label={showToken ? t('settings.apiTokenHide') : t('settings.apiTokenShow')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button type="button" onClick={handleApply} className="btn-primary shrink-0 px-4 py-2 text-sm">
              {t('settings.apiTokenApply')}
            </button>
            <button
              type="button"
              onClick={() => applyToken('')}
              className="btn-ghost shrink-0 px-4 py-2 text-sm"
            >
              {t('settings.apiTokenClear')}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t('settings.apiTokenHint')}</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{statusText}</p>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500" data-testid="app-version">
        {t('settings.appVersion')} {getAppVersion()}
      </p>
    </div>
  );
}
