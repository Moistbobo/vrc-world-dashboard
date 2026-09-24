import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import { initI18n } from '../i18n'
import { afterEach, vi } from 'vitest';
import { resetTestRoute } from './next-navigation';

initI18n('en');

vi.mock('next/navigation', async () => {
  const nav = await import('./next-navigation');
  return {
    useRouter: () => nav.testRouter,
    usePathname: nav.useTestPathname,
    useParams: nav.useTestParams,
    useSearchParams: nav.useTestSearchParams,
  };
});

vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ href, children, ...rest }: { href: unknown; children?: unknown }) =>
      createElement(
        'a',
        { href: typeof href === 'string' ? href : String(href), ...(rest as Record<string, unknown>) },
        children as never,
      ),
  };
});

afterEach(() => {
  resetTestRoute();
});


vi.mock('sonner', () => ({
  Toaster: () => null,
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    message: vi.fn(),
    dismiss: vi.fn(),
    promise: vi.fn(),
  },
}));

class MockIntersectionObserver implements IntersectionObserver {
  root: Document | Element | null = null;
  rootMargin: string = '0px';
  thresholds: ReadonlyArray<number> = [];
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

class MockResizeObserver implements ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});
