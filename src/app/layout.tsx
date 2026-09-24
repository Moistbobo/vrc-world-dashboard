import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { headers } from 'next/headers';
import '../index.css';
import { Providers } from './providers';
import { Layout } from '../components/layout';

export const metadata: Metadata = {
  title: 'SOS World Dashboard',
  description:
    'Browse and search VRChat worlds: player counts, capacity, platforms, quality ratings, tags, and community sentiment.',
  referrer: 'no-referrer',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await headers();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{'html { background-color: #0f172a; }'}</style>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body>
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
