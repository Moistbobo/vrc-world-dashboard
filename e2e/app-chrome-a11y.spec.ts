import { expect, test } from '@playwright/test';
import { mockApi } from './fixtures/mock-api';
import { visitWorlds } from './fixtures/worlds-harness';

const DESKTOP = { width: 1280, height: 800 };

async function visitSettings(page: import('@playwright/test').Page) {
  await mockApi(page);
  await page.goto('/settings');
  await page.getByRole('heading', { name: 'Settings' }).waitFor();
}

async function tabUntil(page: import('@playwright/test').Page, label: string, presses = 12) {
  for (let press = 0; press < presses; press += 1) {
    await page.keyboard.press('Tab');
    const matched = await page.evaluate(
      (name) => document.activeElement?.getAttribute('aria-label') === name,
      label,
    );
    if (matched) return true;
  }
  return false;
}

test.describe('app chrome names and state', () => {
  test('theme toggle exposes a localized name and a state that flips in light mode', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await visitWorlds(page, { theme: 'light' });

    const toggle = page.getByRole('button', { name: 'Toggle theme' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  test('theme toggle reports the dark theme as pressed', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await visitWorlds(page, { theme: 'dark' });

    await expect(page.getByRole('button', { name: 'Toggle theme' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('a seeded Japanese locale gives first-paint lang=ja and a Japanese toggle name', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.addInitScript(() => {
      window.localStorage.setItem('i18nextLng', 'ja');
      window.localStorage.setItem('sos-theme', 'light');
    });
    await mockApi(page);
    await page.goto('/worlds');

    await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
    await expect(page.getByRole('button', { name: 'テーマを切り替える' })).toBeVisible();
  });

  test('collapsed nav links keep names and reveal their tooltip on keyboard focus', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.addInitScript(() => window.localStorage.setItem('sos-sidebar-collapsed', 'true'));
    await visitWorlds(page, { theme: 'light' });

    const dashboard = page.getByRole('link', { name: 'Dashboard' });
    await expect(dashboard).toHaveAttribute('aria-label', 'Dashboard');

    await page.getByRole('link', { name: /skip to main content/i }).focus();
    expect(await tabUntil(page, 'Dashboard')).toBe(true);

    await expect(dashboard.locator('span.pointer-events-none')).toHaveCSS('opacity', '1');
  });

  test('the collapsed logo is a real button with a visible focus ring', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.addInitScript(() => window.localStorage.setItem('sos-sidebar-collapsed', 'true'));
    await visitWorlds(page, { theme: 'light' });

    const logo = page.getByRole('button', { name: 'Show version' });
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('aria-expanded', 'false');

    await page.getByRole('link', { name: /skip to main content/i }).focus();
    expect(await tabUntil(page, 'Show version', 6)).toBe(true);

    await expect(logo).toBeFocused();
    await expect(logo).toHaveAttribute('aria-expanded', 'true');

    const boxShadow = await logo.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(boxShadow).not.toBe('none');
  });

  test('the language select is self-labeling and updates the document language', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await visitSettings(page);

    const select = page.getByRole('combobox', { name: 'Language' });
    await expect(select).toBeVisible();
    await expect(select.locator('option[value="en"]')).toHaveAttribute('lang', 'en');
    await expect(select.locator('option[value="ja"]')).toHaveAttribute('lang', 'ja');

    await select.selectOption('ja');

    await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  });
});
