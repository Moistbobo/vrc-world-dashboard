import type { ReactNode } from 'react';
import '../index.css';

export const metadata = {
  title: 'SOS World Dashboard',
  description:
    'Browse and search VRChat worlds: player counts, capacity, platforms, quality ratings, tags, and community sentiment.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
