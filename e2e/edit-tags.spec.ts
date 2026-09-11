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
    await expect(dialog.getByRole('checkbox', { name: /furry/i })).toBeChecked();

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
    await expect(dialog.getByRole('checkbox', { name: /furry/i })).toBeChecked();
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
    await expect(
      dialog.getByRole('checkbox', { name: /social|dance|chill|study/i }),
    ).toHaveCount(0);

    const heightEmpty = (await dialog.boundingBox())!.height;

    expect(heightFiltered).toBe(heightWithAll);
    expect(heightEmpty).toBe(heightWithAll);
  });
});

test.describe('Edit world tags from the world detail page', () => {
  test('viewers see no Edit tags button on the detail page', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid' });
    await page.goto('/worlds/wrld_mobile_only');

    await expect(page.getByRole('heading', { name: 'Mobile Hangout' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit tags' })).toHaveCount(0);
  });

  test('curator opens the dialog pre-selected, toggles a tag, and saves in place', async ({
    page,
  }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });
    await page.goto('/worlds/wrld_mobile_only');

    await expect(page.getByRole('heading', { name: 'Mobile Hangout' })).toBeVisible();
    await page.getByRole('button', { name: 'Edit tags' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('checkbox', { name: /social/i })).toBeChecked();
    await expect(dialog.getByRole('checkbox', { name: /chill/i })).not.toBeChecked();
    await expect(dialog.getByRole('checkbox', { name: /furry/i })).toBeChecked();

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

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await reconciled;
    await expect(page.getByText('chill', { exact: true })).toBeVisible();
  });

  test('Escape closes the dialog without a request', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });
    await page.goto('/worlds/wrld_mobile_only');
    await expect(page.getByRole('heading', { name: 'Mobile Hangout' })).toBeVisible();

    let putCount = 0;
    page.on('request', (req) => {
      if (req.method() === 'PUT') putCount += 1;
    });

    await page.getByRole('button', { name: 'Edit tags' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(putCount).toBe(0);
  });

  test('curator toggles only a flag and saves without a tags request', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });
    await page.goto('/worlds/wrld_mobile_only');
    await expect(page.getByRole('heading', { name: 'Mobile Hangout' })).toBeVisible();

    await page.getByRole('button', { name: 'Edit tags' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('checkbox', { name: /furry/i })).toBeChecked();
    await dialog.getByRole('checkbox', { name: /low quality/i }).check();

    let tagsPuts = 0;
    page.on('request', (req) => {
      if (req.method() === 'PUT' && req.url().includes('/tags/edit')) tagsPuts += 1;
    });
    const flagsRequest = page.waitForRequest(
      (req) =>
        req.method() === 'PUT' && req.url().includes('/api/worlds/wrld_mobile_only/flags/edit'),
    );
    const reconciled = waitForWorldFetch(page, 'wrld_mobile_only');
    await dialog.getByRole('button', { name: 'Save' }).click();

    expect((await flagsRequest).postDataJSON()).toEqual({ flags: ['furry', 'low quality'] });
    expect(tagsPuts).toBe(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await reconciled;
    await expect(page.getByTitle('low quality')).toBeVisible();
  });
});
