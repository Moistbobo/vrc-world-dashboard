import { expect, test } from '@playwright/test';
import { visitWorlds, waitForWorldFetch } from './fixtures/worlds-harness';

test.describe('Edit world tags', () => {
  test('viewers see no Edit tags button', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid' });

    await expect(page.getByRole('heading', { name: 'Mobile Hangout' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit tags' })).toHaveCount(0);
  });

  test('curator opens the dialog pre-selected, toggles a tag, and saves', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });

    const card = page.locator('.card').filter({ hasText: 'Mobile Hangout' });
    await card.getByRole('button', { name: 'Edit tags' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('checkbox', { name: /social/i })).toBeChecked();
    await expect(dialog.getByRole('checkbox', { name: /chill/i })).not.toBeChecked();

    await dialog.getByRole('checkbox', { name: /chill/i }).check();

    const tagsRequest = page.waitForRequest(
      (req) =>
        req.method() === 'PUT' && req.url().includes('/api/worlds/wrld_mobile_only/tags/edit'),
    );
    const reconciled = waitForWorldFetch(page, 'wrld_mobile_only');
    await dialog.getByRole('button', { name: 'Save' }).click();

    expect((await tagsRequest).postDataJSON()).toEqual({
      guildId: 'guild_e2e',
      tags: ['social', 'chill'],
    });
    await reconciled;

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(card.getByText('chill', { exact: true })).toBeVisible();
  });

  test('toggling tags works in dark mode and on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await visitWorlds(page, {
      scrollMode: 'pagination',
      viewMode: 'grid',
      curator: true,
      theme: 'dark',
    });

    const card = page.locator('.card').filter({ hasText: 'Mobile Hangout' });
    await card.getByRole('button', { name: 'Edit tags' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('checkbox', { name: /social/i })).toBeChecked();
    await expect(dialog.getByRole('checkbox', { name: /chill/i })).not.toBeChecked();
  });

  test('search filters tags case-insensitively', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });

    const card = page.locator('.card').filter({ hasText: 'Mobile Hangout' });
    await card.getByRole('button', { name: 'Edit tags' }).click();

    const dialog = page.getByRole('dialog');
    const search = dialog.getByRole('textbox', { name: 'Search tags' });
    await expect(search).toBeVisible();

    await search.fill('SOCIAL');
    await expect(dialog.getByRole('checkbox', { name: /social/i })).toBeVisible();
    await expect(dialog.getByRole('checkbox', { name: /dance/i })).toHaveCount(0);
    await expect(dialog.getByRole('checkbox', { name: /chill/i })).toHaveCount(0);
  });

  test('dialog size stays constant when the search filters tags', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });

    const card = page.locator('.card').filter({ hasText: 'Mobile Hangout' });
    await card.getByRole('button', { name: 'Edit tags' }).click();

    const dialog = page.getByRole('dialog');
    const search = dialog.getByRole('textbox', { name: 'Search tags' });
    await expect(search).toBeVisible();

    const heightWithAll = (await dialog.boundingBox())!.height;

    await search.fill('SOCIAL');
    await expect(dialog.getByRole('checkbox', { name: /social/i })).toBeVisible();

    const heightFiltered = (await dialog.boundingBox())!.height;

    await search.fill('zzz');
    await expect(dialog.getByRole('checkbox')).toHaveCount(0);

    const heightEmpty = (await dialog.boundingBox())!.height;

    expect(heightFiltered).toBe(heightWithAll);
    expect(heightEmpty).toBe(heightWithAll);
  });
});