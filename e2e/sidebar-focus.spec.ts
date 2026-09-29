import { expect, test } from '@playwright/test';
import { visitWorlds } from './fixtures/worlds-harness';

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

async function focusIsInsideSidebar(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const sidebar = document.querySelector('aside');
    const active = document.activeElement;
    return Boolean(sidebar && active && sidebar.contains(active));
  });
}

test.describe('off-canvas sidebar focus', () => {
  test('closed sidebar is inert and skipped by Tab below lg', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await visitWorlds(page);

    const aside = page.locator('aside');
    await expect(aside).toHaveAttribute('inert', '');

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /skip to main content/i })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /open sidebar/i })).toBeFocused();

    for (let press = 1; press <= 8; press += 1) {
      await page.keyboard.press('Tab');
      expect(await focusIsInsideSidebar(page), `focus entered the closed sidebar on tab ${press}`).toBe(
        false,
      );
    }
  });

  test('opening moves focus into the sidebar and Escape restores it to the toggle', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE);
    await visitWorlds(page);

    const aside = page.locator('aside');
    const open = page.getByRole('button', { name: /open sidebar/i });
    const close = page.getByRole('button', { name: /close sidebar/i });

    await open.click();
    await expect(aside).not.toHaveAttribute('inert');
    await expect(close).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(aside).toHaveAttribute('inert', '');
    await expect(open).toBeFocused();
  });

  test('the close button returns focus to the toggle', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await visitWorlds(page);

    const open = page.getByRole('button', { name: /open sidebar/i });
    await open.click();
    await page.getByRole('button', { name: /close sidebar/i }).click();

    await expect(page.locator('aside')).toHaveAttribute('inert', '');
    await expect(open).toBeFocused();
  });

  test('at or above lg the sidebar stays reachable and not inert', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await visitWorlds(page);

    const aside = page.locator('aside');
    await expect(aside).not.toHaveAttribute('inert');

    const dashboard = aside.getByRole('link', { name: 'Dashboard' });
    await expect(dashboard).toBeVisible();
    await dashboard.focus();
    await expect(dashboard).toBeFocused();
  });

  test('while open below lg, Tab never moves focus into the page behind the drawer', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE);
    await visitWorlds(page);

    await page.getByRole('button', { name: /open sidebar/i }).click();
    await expect(page.getByRole('button', { name: /close sidebar/i })).toBeFocused();

    for (let press = 1; press <= 12; press += 1) {
      await page.keyboard.press('Tab');
      const behind = await page.evaluate(() => {
        const active = document.activeElement;
        const header = document.querySelector('header');
        const main = document.querySelector('main');
        return Boolean(
          active && ((header && header.contains(active)) || (main && main.contains(active))),
        );
      });
      expect(behind, `focus moved behind the drawer on tab ${press}`).toBe(false);
    }
  });

  test('a document-level Escape closes the open drawer', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await visitWorlds(page);

    const aside = page.locator('aside');
    const open = page.getByRole('button', { name: /open sidebar/i });
    await open.click();
    await expect(aside).not.toHaveAttribute('inert');

    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    await expect(aside).toHaveAttribute('inert', '');
    await expect(open).toBeFocused();
  });

  test('resizing across lg while open never leaves the sidebar inert', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await visitWorlds(page);
    await page.getByRole('button', { name: /open sidebar/i }).click();

    const aside = page.locator('aside');
    await expect(aside).not.toHaveAttribute('inert');

    await page.setViewportSize(DESKTOP);
    await expect(aside).not.toHaveAttribute('inert');

    await page.setViewportSize(MOBILE);
    await expect(aside).not.toHaveAttribute('inert');
  });
});
