import type { Page } from '@playwright/test';
import { mockApi } from './mock-api';

export type ScrollMode = 'infinite' | 'pagination';
export type ViewMode = 'grid' | 'list';

export interface WorldsVisitOptions {
  scrollMode?: ScrollMode;
  viewMode?: ViewMode;
  theme?: 'light' | 'dark';
  queryString?: string;
  /**
   * Seed an entered API token (`sos-api-token`) so the curator filter section
   * and badges render. Without it, `WorldsPage` gates curator UI off, matching
   * a viewer token. The mock `/api/me` fixture returns a curator regardless.
   */
  curator?: boolean;
}

/**
 * Seed a stored API token (`sos-api-token`) without the Settings-Apply
 * ceremony, simulating a page refresh with a token from a previous session.
 * With the fix in `useMe`, the app must re-verify identity against `/api/me`
 * on its own rather than waiting for the user to click Apply again.
 */
export function seedStoredToken(page: Page) {
  return page.addInitScript(() => {
    window.localStorage.setItem('sos-api-token', 'e2e-curator-token');
  });
}

export async function visitWorlds(page: Page, options: WorldsVisitOptions = {}) {
  const { scrollMode = 'infinite', viewMode = 'grid', theme = 'light', queryString = '', curator = false } = options;
  await page.addInitScript(
    ({ scrollMode, viewMode, theme, curator }) => {
      window.localStorage.setItem('sos-worlds-scroll-mode', scrollMode);
      window.localStorage.setItem('sos-worlds-view-mode', viewMode);
      window.localStorage.setItem('sos-theme', theme);
      if (curator) {
        window.localStorage.setItem('sos-api-token', 'e2e-curator-token');
      }
    },
    { scrollMode, viewMode, theme, curator },
  );
  await mockApi(page);

  if (curator) {
    await page.goto('/settings');
    const meResponse = page.waitForResponse(
      (res) => res.url().includes('/api/me') && res.status() === 200,
    );
    await page.getByRole('button', { name: /apply/i }).click();
    await meResponse;
    await page.evaluate((qs) => {
      window.history.pushState({}, '', `/worlds${qs}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, queryString);
  } else {
    await page.goto(`/worlds${queryString}`);
  }

  await page.getByRole('heading', { name: /worlds/i }).waitFor();
}

export async function expandFilters(page: Page) {
  await page.getByRole('button', { name: /filters/i }).click();
}

export async function waitForWorldsRequest(
  page: Page,
  predicate: (url: URL) => boolean,
): Promise<URL> {
  const request = await page.waitForRequest((req) => {
    if (!req.url().includes('/api/worlds')) return false;
    try {
      return predicate(new URL(req.url()));
    } catch {
      return false;
    }
  });
  return new URL(request.url());
}
