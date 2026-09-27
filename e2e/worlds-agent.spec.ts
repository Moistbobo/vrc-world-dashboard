import { expect, test } from '@playwright/test';
import { visitWorlds, waitForWorldsRequest } from './fixtures/worlds-harness';

async function ask(page: import('@playwright/test').Page, query: string) {
  await page.getByRole('textbox', { name: /describe the worlds you want/i }).fill(query);
  await page.getByRole('button', { name: /^search$/i }).click();
}

test.describe('Worlds agent panel', () => {
  test('viewers without worlds:write never see the panel', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid' });

    await expect(page.getByRole('heading', { name: 'Chill Lounge' }).first()).toBeVisible();
    await expect(page.getByText('Worlds assistant')).toHaveCount(0);
  });

  test('curator sees the interpretation and matching cards', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });

    const panel = page.getByRole('region', { name: 'Worlds assistant' });
    await expect(panel).toBeVisible();

    await ask(page, 'chill worlds for 4 people');

    await expect(panel.getByText(/interpreted as/i)).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Chill Lounge' })).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Dance Party' })).toHaveCount(0);
  });

  test('reports tags it could not match', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });

    const panel = page.getByRole('region', { name: 'Worlds assistant' });
    await ask(page, 'zombie worlds');

    await expect(panel.getByText(/ignored unknown tags: zombie/i)).toBeVisible();
  });

  test('names the interpreted tags when nothing matches', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });

    const panel = page.getByRole('region', { name: 'Worlds assistant' });
    await ask(page, 'kino worlds');

    await expect(panel.getByText(/no worlds matched the tags: kino/i)).toBeVisible();
    await expect(panel.getByRole('heading')).toHaveCount(0);
  });

  test('shows an error state with retry and no world list', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });

    const panel = page.getByRole('region', { name: 'Worlds assistant' });
    await ask(page, 'trigger error');

    await expect(panel.getByText(/could not run the assistant/i)).toBeVisible();
    await expect(panel.getByRole('button', { name: /retry/i })).toBeVisible();
    await expect(panel.getByRole('heading')).toHaveCount(0);
  });

  test('View all in Worlds reproduces the derived filters', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });

    const panel = page.getByRole('region', { name: 'Worlds assistant' });
    await ask(page, 'chill worlds for 4 people');
    await expect(panel.getByText(/interpreted as/i)).toBeVisible();

    const nextWorldsRequest = waitForWorldsRequest(
      page,
      (url) => url.searchParams.get('minCapacity') === '4' && url.searchParams.getAll('tag').includes('chill'),
    );
    await panel.getByRole('button', { name: /view all in worlds/i }).click();

    const requestUrl = await nextWorldsRequest;
    expect(requestUrl.searchParams.get('minCapacity')).toBe('4');
    expect(requestUrl.searchParams.getAll('tag')).toContain('chill');
    await expect(page).toHaveURL(/minCapacity=4/);
  });
});
