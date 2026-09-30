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
  /** Force every `/api/worlds` request to fail with a 500 after the mock is registered. */
  failWorlds?: boolean;
  /** Force every `/api/tags` request to fail with a 500 after the mock is registered. */
  failTags?: boolean;
}

export interface TagsVisitOptions {
  theme?: 'light' | 'dark';
  /** Force every `/api/tags` request to fail with a 500 after the mock is registered. */
  failTags?: boolean;
}

/**
 * Register a route *after* `mockApi` so Playwright's last-registered-wins
 * ordering lets it intercept first. Requests that are not selected fall back
 * to the mock so the rest of the page keeps working.
 */
export async function installFailureOverrides(
  page: Page,
  options: { failWorlds?: boolean; failTags?: boolean },
) {
  const { failWorlds = false, failTags = false } = options;
  if (!failWorlds && !failTags) return;
  await page.route(/\/api\/(worlds|tags)(?:[?#].*)?$/, (route) => {
    const path = new URL(route.request().url()).pathname;
    if ((failWorlds && path === '/api/worlds') || (failTags && path === '/api/tags')) {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'e2e forced failure' }),
      });
    }
    return route.fallback();
  });
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
  const {
    scrollMode = 'infinite',
    viewMode = 'grid',
    theme = 'light',
    queryString = '',
    curator = false,
    failWorlds = false,
    failTags = false,
  } = options;
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
  await installFailureOverrides(page, { failWorlds, failTags });

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

export async function visitTags(page: Page, options: TagsVisitOptions = {}) {
  const { theme = 'light', failTags = false } = options;
  await page.addInitScript(({ theme }) => {
    window.localStorage.setItem('sos-theme', theme);
  }, { theme });
  await mockApi(page);
  await installFailureOverrides(page, { failTags });
  await page.goto('/tags');
  await page.getByRole('heading', { name: /tags/i }).waitFor();
}

export interface AssistantVisitOptions {
  theme?: 'light' | 'dark';
  curator?: boolean;
}

export async function visitAssistant(page: Page, options: AssistantVisitOptions = {}) {
  const { theme = 'light', curator = false } = options;
  await page.addInitScript(
    ({ theme, curator }) => {
      window.localStorage.setItem('sos-theme', theme);
      if (curator) {
        window.localStorage.setItem('sos-api-token', 'e2e-curator-token');
      }
    },
    { theme, curator },
  );
  await mockApi(page);

  if (curator) {
    await page.goto('/settings');
    const meResponse = page.waitForResponse(
      (res) => res.url().includes('/api/me') && res.status() === 200,
    );
    await page.getByRole('button', { name: /apply/i }).click();
    await meResponse;
    await page.evaluate(() => {
      window.history.pushState({}, '', '/assistant');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.getByRole('heading', { name: 'Worlds assistant' }).waitFor();
  } else {
    await page.goto('/assistant');
  }
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

export async function waitForWorldFetch(page: Page, worldId: string): Promise<void> {
  await page.waitForRequest(
    (req) => req.method() === 'GET' && new URL(req.url()).pathname === `/api/worlds/${worldId}`,
  );
}
