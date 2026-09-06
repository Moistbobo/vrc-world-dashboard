import { expect, test } from '@playwright/test';
import { mockApi } from './fixtures/mock-api';
import { expandFilters, visitWorlds, waitForWorldsRequest } from './fixtures/worlds-harness';

test.describe('Exclude tags (flags)', () => {
  test('card shows a closed Show flags toggle for flagged worlds and none for flag-free worlds', async ({
    page,
  }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid' });

    const flaggedCard = page.locator('.card').filter({ hasText: 'Chill Lounge' });
    const showFlags = flaggedCard.getByRole('button', { name: 'Show flags' });
    await expect(showFlags).toBeVisible();
    await expect(showFlags).toHaveAttribute('aria-expanded', 'false');
    await expect(flaggedCard.getByTitle('furry')).toHaveCount(0);

    await showFlags.click();
    await expect(flaggedCard.getByTitle('furry')).toBeVisible();
    await expect(flaggedCard.getByTitle('low quality')).toBeVisible();

    const plainCard = page.locator('.card').filter({ hasText: 'Dance Party' });
    await expect(plainCard.getByRole('button', { name: 'Show flags' })).toHaveCount(0);
  });

  test('toggling a flag chip filters results and unchecking restores them', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid' });
    await expandFilters(page);

    const flagChip = page.getByRole('button', { name: /furry\s+\(\d+\)/ });
    const req = waitForWorldsRequest(page, (url) => url.searchParams.get('exclude') === 'furry');
    await flagChip.click();

    expect((await req).searchParams.get('exclude')).toBe('furry');
    await expect(page.getByRole('heading', { name: 'Chill Lounge' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Dance Party' })).toBeVisible();

    const restoreReq = waitForWorldsRequest(
      page,
      (url) => !url.searchParams.get('exclude'),
    );
    await page.getByRole('button', { name: /remove flag filter furry/i }).click();
    expect((await restoreReq).searchParams.get('exclude')).toBeNull();
    await expect(page.getByRole('heading', { name: 'Chill Lounge' })).toBeVisible();
  });

  test('detail page shows the Flags section and a chip navigates to the exclude filter', async ({
    page,
  }) => {
    await mockApi(page);
    await page.goto('/worlds/wrld_chill_lounge');
    await page.waitForResponse((res) => res.url().includes('/api/worlds/wrld_chill_lounge'));

    await expect(page.getByTitle('furry')).toBeVisible();
    await expect(page.getByTitle('low quality')).toBeVisible();

    const worldsReq = waitForWorldsRequest(page, (url) => {
      return url.pathname.endsWith('/worlds') && url.searchParams.get('exclude') === 'furry';
    });
    await page.getByTitle('furry').click();

    await expect(page).toHaveURL(/\/worlds\?exclude=furry$/);
    expect((await worldsReq).searchParams.get('exclude')).toBe('furry');
  });

  test('curator dialog pre-selects flags and saving PUTs only the changed flags', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });

    const card = page.locator('.card').filter({ hasText: 'Chill Lounge' });
    await card.getByRole('button', { name: 'Edit tags' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('checkbox', { name: /furry/i })).toBeChecked();
    await expect(dialog.getByRole('checkbox', { name: /low quality/i })).toBeChecked();
    await expect(dialog.getByRole('checkbox', { name: /booth slop/i })).not.toBeChecked();

    await dialog.getByRole('checkbox', { name: /booth slop/i }).check();

    const flagsRequest = page.waitForRequest(
      (req) =>
        req.method() === 'PUT' && req.url().includes('/api/worlds/wrld_chill_lounge/flags/edit'),
    );
    await dialog.getByRole('button', { name: 'Save' }).click();

    expect((await flagsRequest).postDataJSON()).toEqual({
      flags: ['furry', 'low quality', 'booth slop'],
    });

    await expect(dialog).toHaveCount(0);
    await card.getByRole('button', { name: 'Show flags' }).click();
    await expect(card.getByTitle('booth slop')).toBeVisible();
  });

  test('flag chips meet the 48px VR touch-target minimum', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid' });
    await expandFilters(page);

    const flagChip = page.getByRole('button', { name: /booth slop\s+\(\d+\)/ });
    const { height } = await flagChip.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { height: r.height };
    });
    expect(height, `flag chip height ${height}px`).toBeGreaterThanOrEqual(48);
  });

  test('flag toggle and filter chips work in dark mode on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await visitWorlds(page, {
      scrollMode: 'pagination',
      viewMode: 'grid',
      theme: 'dark',
    });

    const flaggedCard = page.locator('.card').filter({ hasText: 'Chill Lounge' });
    await flaggedCard.getByRole('button', { name: 'Show flags' }).click();
    await expect(flaggedCard.getByTitle('furry')).toBeVisible();

    await expandFilters(page);
    await expect(page.getByRole('button', { name: /furry\s+\(\d+\)/ })).toBeVisible();
  });
});
