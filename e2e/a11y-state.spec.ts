import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  expandFilters,
  visitAssistant,
  visitTags,
  visitWorlds,
  waitForWorldsRequest,
} from './fixtures/worlds-harness';

async function auditHeadingsAndLandmarks(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((h) =>
      Number(h.tagName.slice(1)),
    );
    const h1Count = headings.filter((level) => level === 1).length;
    if (h1Count !== 1) issues.push(`expected exactly one h1, found ${h1Count}`);
    let previous = 0;
    for (const level of headings) {
      if (previous !== 0 && level > previous + 1) {
        issues.push(`heading level jumped from h${previous} to h${level}`);
      }
      previous = level;
    }
    if (document.querySelectorAll('main').length !== 1) {
      issues.push('expected exactly one main landmark');
    }
    return { headings, issues };
  });
}

test.describe('selection state and live regions', () => {
  test('a tag toggle exposes its pressed state', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid' });
    await expandFilters(page);

    const tag = page.getByRole('button', { name: /chill\s+\(\d+\)/ });
    await expect(tag).toHaveAttribute('aria-pressed', 'false');

    const request = waitForWorldsRequest(page, (url) => url.searchParams.get('tag') === 'chill');
    await tag.click();
    await request;

    await expect(page.getByRole('button', { name: /chill\s+\(\d+\)/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('pagination marks the current page and announces the visible range', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid' });

    const nav = page.getByRole('navigation', { name: /pagination/i });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('status')).toContainText(/1 – \d+ of \d+/);
  });

  test('the result count stays in the accessibility tree below sm', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await visitWorlds(page);

    const status = page.getByRole('status').filter({ hasText: /number of results/i });
    await expect(status).toHaveCount(1);

    const style = await status.evaluate((el) => {
      const computed = getComputedStyle(el);
      return { display: computed.display, width: el.clientWidth };
    });
    expect(style.display).not.toBe('none');
    expect(style.width).toBeLessThanOrEqual(2);
  });

  test('a failed worlds fetch announces an alert and offers retry', async ({ page }) => {
    await visitWorlds(page, { failWorlds: true });

    const alert = page.getByRole('alert');
    await expect(alert).toContainText(/failed to load worlds/i, { timeout: 20_000 });
    await expect(alert.getByRole('button', { name: /try again/i })).toBeVisible();
  });

  test('a failed tags fetch announces an alert and offers retry', async ({ page }) => {
    await visitTags(page, { failTags: true });

    const alert = page.getByRole('alert');
    await expect(alert).toContainText(/failed to load tags/i, { timeout: 20_000 });
    await expect(alert.getByRole('button', { name: /try again/i })).toBeVisible();
  });

  test('every route sets a unique document title', async ({ page }) => {
    await visitWorlds(page);
    await expect(page).toHaveTitle('Worlds');

    await page.goto('/tags');
    await expect(page.getByRole('heading', { name: /^Tags$/ })).toBeVisible();
    await expect(page).toHaveTitle('Tags');

    await page.goto('/lists');
    await expect(page.getByRole('heading', { name: /my lists/i })).toBeVisible();
    await expect(page).toHaveTitle('My Lists');

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /^Settings$/ })).toBeVisible();
    await expect(page).toHaveTitle('Settings');
  });

  test('a curator visiting /assistant gets the assistant title', async ({ page }) => {
    await visitAssistant(page, { curator: true });
    await expect(page).toHaveTitle('Worlds assistant');
  });

  test('an unknown path renders a single titled 404 heading', async ({ page }) => {
    await visitWorlds(page);
    await page.goto('/this-route-does-not-exist');

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/page not found/i);
    await expect(page).toHaveTitle('Page not found');

    const audit = await auditHeadingsAndLandmarks(page);
    expect(audit.issues, JSON.stringify(audit)).toEqual([]);
  });

  test('the worlds page keeps heading order and landmarks intact', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid' });
    const audit = await auditHeadingsAndLandmarks(page);
    expect(audit.issues, JSON.stringify(audit)).toEqual([]);
  });
});
