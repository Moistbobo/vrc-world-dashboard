'use client';

import { useState, type ReactNode } from 'react';
import '../i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Analytics } from '@vercel/analytics/next';
import { ThemeProvider } from '../contexts/ThemeContext';
import { TagMetaProvider } from '../contexts/TagMetaContext';
import { WorldsPreferencesProvider } from '../contexts/WorldsPreferencesContext';
import { ListsPreferencesProvider } from '../contexts/ListsPreferencesContext';
import { ListsProvider } from '../contexts/ListsContext';
import { Toaster } from '../components/toaster';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
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
  );
}
