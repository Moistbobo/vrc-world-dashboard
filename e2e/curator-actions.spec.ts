import { expect, test } from '@playwright/test';
import { seedStoredToken, visitWorlds, waitForWorldsRequest } from './fixtures/worlds-harness';
import { mockApi } from './fixtures/mock-api';

test.describe('Curator quick actions', () => {
  test('re-verifies a stored token on refresh, without re-applying in Settings', async ({ page }) => {
    await seedStoredToken(page);
    await mockApi(page);

    const meRequest = page.waitForResponse(
      (res) => res.url().includes('/api/me') && res.status() === 200,
    );
    await page.goto('/worlds');

    await meRequest;
    const card = page.locator('.card').filter({ hasText: 'Mobile Hangout' });
    await expect(card.getByRole('button', { name: 'Mark Good' })).toBeVisible();
  });
  test('viewers see no quick-action buttons', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid' });

    await expect(page.getByRole('heading', { name: 'Mobile Hangout' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /mark good|mark bad|mark high priority|clear quality/i }),
    ).toHaveCount(0);
  });

  test('untagged world shows three actions and marking good applies the tag', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });

    const card = page.locator('.card').filter({ hasText: 'Mobile Hangout' });
    await expect(card.getByRole('button', { name: 'Mark Good' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Mark Bad' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Mark High Priority' })).toBeVisible();

    const qualityRequest = page.waitForRequest(
      (req) => req.method() === 'PUT' && req.url().includes('/api/worlds/wrld_mobile_only/quality'),
    );
    const refetch = waitForWorldsRequest(page, (url) => url.searchParams.get('limit') === '20');
    await card.getByRole('button', { name: 'Mark Good' }).click();

    const sent = await qualityRequest;
    expect(sent.postDataJSON()).toEqual({ guildId: 'guild_e2e', quality: 'good' });
    await refetch;

    await expect(card.getByRole('button', { name: 'Clear Quality' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Mark Good' })).toHaveCount(0);
    await expect(card.getByText('Good', { exact: true })).toBeVisible();
  });

  test('high-priority world leaves the HP filter list after being marked bad', async ({ page }) => {
    await visitWorlds(page, {
      scrollMode: 'pagination',
      viewMode: 'grid',
      curator: true,
      queryString: '?highPriority=true',
    });

    const card = page.locator('.card').filter({ hasText: 'Priority Watch' });
    await expect(card.getByRole('button', { name: 'Mark Good' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Mark Bad' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Mark High Priority' })).toHaveCount(0);
    await expect(card.getByRole('button', { name: 'Clear Quality' })).toBeVisible();

    const qualityRequest = page.waitForRequest(
      (req) => req.method() === 'PUT' && req.url().includes('/api/worlds/wrld_priority_watch/quality'),
    );
    const deleteRequest = page.waitForRequest(
      (req) =>
        req.method() === 'DELETE' && req.url().includes('/api/worlds/wrld_priority_watch/high-priority'),
    );
    const refetch = waitForWorldsRequest(page, (url) => url.searchParams.get('limit') === '20');
    await card.getByRole('button', { name: 'Mark Bad' }).click();

    expect((await qualityRequest).postDataJSON()).toEqual({
      guildId: 'guild_e2e',
      quality: 'bad',
    });
    expect((await deleteRequest).postDataJSON()).toEqual({ guildId: 'guild_e2e' });
    await refetch;

    await expect(page.getByRole('heading', { name: 'Priority Watch' })).toHaveCount(0);
  });

  test('high-priority world Clear Quality removes it from the HP filter list', async ({ page }) => {
    await visitWorlds(page, {
      scrollMode: 'pagination',
      viewMode: 'grid',
      curator: true,
      queryString: '?highPriority=true',
    });

    const card = page.locator('.card').filter({ hasText: 'Priority Watch' });
    await expect(card.getByRole('button', { name: 'Mark Good' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Mark Bad' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Clear Quality' })).toBeVisible();

    const deleteRequest = page.waitForRequest(
      (req) =>
        req.method() === 'DELETE' && req.url().includes('/api/worlds/wrld_priority_watch/high-priority'),
    );
    const refetch = waitForWorldsRequest(page, (url) => url.searchParams.get('limit') === '20');
    await card.getByRole('button', { name: 'Clear Quality' }).click();

    expect((await deleteRequest).postDataJSON()).toEqual({ guildId: 'guild_e2e' });
    await refetch;

    await expect(page.getByRole('heading', { name: 'Priority Watch' })).toHaveCount(0);
  });

  test('quality-tagged world shows only Clear Quality and resetting restores the three actions', async ({
    page,
  }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });

    const card = page.locator('.card').filter({ hasText: 'Dance Party' });
    await expect(card.getByRole('button', { name: 'Clear Quality' })).toBeVisible();
    await expect(card.getByRole('button', { name: /mark (good|bad|high priority)/i })).toHaveCount(0);

    const qualityRequest = page.waitForRequest(
      (req) => req.method() === 'PUT' && req.url().includes('/api/worlds/wrld_dance_party/quality'),
    );
    const refetch = waitForWorldsRequest(page, (url) => url.searchParams.get('limit') === '20');
    await card.getByRole('button', { name: 'Clear Quality' }).click();

    expect((await qualityRequest).postDataJSON()).toEqual({ guildId: 'guild_e2e', quality: null });
    await refetch;

    await expect(card.getByRole('button', { name: 'Mark Good' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Mark Bad' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Mark High Priority' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Clear Quality' })).toHaveCount(0);
  });

  test('marking high priority adds the badge', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });

    const card = page.locator('.card').filter({ hasText: 'Mobile Hangout' });
    const priorityRequest = page.waitForRequest(
      (req) =>
        req.method() === 'PUT' && req.url().includes('/api/worlds/wrld_mobile_only/high-priority'),
    );
    const refetch = waitForWorldsRequest(page, (url) => url.searchParams.get('limit') === '20');
    await card.getByRole('button', { name: 'Mark High Priority' }).click();

    expect((await priorityRequest).postDataJSON()).toEqual({ guildId: 'guild_e2e' });
    await refetch;

    await expect(card.getByText('High Priority', { exact: true })).toBeVisible();
  });
});
