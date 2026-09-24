'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Analytics } from '@vercel/analytics/next';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '../contexts/ThemeContext';
import { TagMetaProvider } from '../contexts/TagMetaContext';
import { WorldsPreferencesProvider } from '../contexts/WorldsPreferencesContext';
import { ListsPreferencesProvider } from '../contexts/ListsPreferencesContext';
import { ListsProvider } from '../contexts/ListsContext';
import { Toaster } from '../components/toaster';
import { createI18n, normalizeLanguage } from '../i18n';
import { LANGUAGE_COOKIE } from '../i18n/constants';
import { useRefresh } from '../lib/navigation';

export function Providers({ children, lang }: { children: ReactNode; lang: string }) {
  const [queryClient] = useState(() => new QueryClient());
  const i18n = useMemo(() => createI18n(normalizeLanguage(lang)), [lang]);
  const refresh = useRefresh();

  useEffect(() => {
    const hasCookie = document.cookie
      .split('; ')
      .some((entry) => entry.startsWith(`${LANGUAGE_COOKIE}=`));
    if (hasCookie) return;

    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LANGUAGE_COOKIE);
    } catch {
      // ignore storage errors
    }
    if (stored === 'ja' || stored === 'en') {
      const secure = window.location.protocol === 'https:' ? '; secure' : '';
      document.cookie = `${LANGUAGE_COOKIE}=${stored}; path=/; max-age=31536000; samesite=lax${secure}`;
      refresh();
    }
  }, [refresh]);

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <TagMetaProvider>
          <ThemeProvider>
            <WorldsPreferencesProvider>
              <ListsPreferencesProvider>
                <ListsProvider>
                  {children}
                  <Analytics />
                </ListsProvider>
              </ListsPreferencesProvider>
            </WorldsPreferencesProvider>
            <Toaster />
          </ThemeProvider>
        </TagMetaProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </I18nextProvider>
  );
}
