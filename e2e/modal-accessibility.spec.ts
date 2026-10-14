import { expect, test } from '@playwright/test';
import { visitWorlds, waitForWorldsRequest } from './fixtures/worlds-harness';

test.describe('Modal accessibility', () => {
  test('lightbox is named, inerts the background, and restores focus on Escape', async ({ page }) => {
    await visitWorlds(page);
    await page.goto('/worlds/wrld_gallery_wall');
    await expect(page.getByRole('heading', { name: 'Gallery Wall' })).toBeVisible();

    const trigger = page.getByRole('button', {
      name: /open full-size image of Gallery Wall/i,
    });
    await trigger.click();

    const lightbox = page.getByRole('dialog', { name: /image of Gallery Wall/i });
    await expect(lightbox).toBeVisible();
    await expect(page.locator('#root')).toHaveAttribute('inert', '');

    const backgroundReceivedFocus = await page.evaluate(() => {
      const background = document.querySelector<HTMLElement>('#root button');
      background?.focus();
      return document.activeElement === background;
    });
    expect(backgroundReceivedFocus).toBe(false);

    await page.keyboard.press('Escape');
    await expect(lightbox).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.locator('#root')).not.toHaveAttribute('inert');
  });

  test('Escape closes only the topmost nested dialog', async ({ page }) => {
    await visitWorlds(page, { curator: true });
    await page.goto('/worlds/wrld_gallery_wall');
    await expect(page.getByRole('heading', { name: 'Gallery Wall' })).toBeVisible();

    await page.getByRole('button', { name: /save to list/i }).click();
    const saveDialog = page.getByRole('dialog', { name: /save to list/i });
    await expect(saveDialog).toBeVisible();

    await saveDialog.getByRole('button', { name: /create new list/i }).click();
    const createDialog = page.getByRole('dialog', { name: /new list/i });
    await expect(createDialog).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(2);

    await page.keyboard.press('Escape');
    await expect(createDialog).toHaveCount(0);
    await expect(saveDialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(saveDialog).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('each dialog opened from the world detail page exposes a name', async ({ page }) => {
    await visitWorlds(page, { curator: true });
    const worldsRequest = waitForWorldsRequest(
      page,
      (url) => url.pathname === '/api/worlds/wrld_gallery_wall',
    );
    await page.goto('/worlds/wrld_gallery_wall');
    await worldsRequest;

    await page.getByRole('button', { name: /save to list/i }).click();
    await expect(
      page.getByRole('dialog', { name: /save to list/i }),
    ).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /edit tags/i }).click();
    await expect(
      page.getByRole('dialog', { name: /edit tags/i }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
  });
});
