import { expect, test } from '@playwright/test';
import { seedStoredToken, visitAssistant, visitWorlds } from './fixtures/worlds-harness';
import { mockApi } from './fixtures/mock-api';

async function ask(page: import('@playwright/test').Page, query: string) {
  await page.getByRole('textbox', { name: /describe the worlds you want/i }).fill(query);
  await page.getByRole('button', { name: /^search$/i }).click();
}

test.describe('Worlds agent panel', () => {
  test('viewer without worlds:write is redirected from /assistant to /worlds', async ({ page }) => {
    await visitAssistant(page);

    await expect(page).toHaveURL(/\/worlds$/);
    await expect(page.getByRole('link', { name: 'AI Search' })).toHaveCount(0);
    await expect(page.getByText('Worlds assistant')).toHaveCount(0);
  });

  test('curator sees the panel region and the AI Search link', async ({ page }) => {
    await visitAssistant(page, { curator: true });

    await expect(page.getByRole('region', { name: 'Worlds assistant' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'AI Search' })).toBeVisible();
  });

  test('curator deep-linking to /assistant on a fresh load stays on /assistant', async ({ page }) => {
    await seedStoredToken(page);
    await mockApi(page);

    await page.goto('/assistant');

    await expect(page).toHaveURL(/\/assistant$/);
    await expect(page.getByRole('region', { name: 'Worlds assistant' })).toBeVisible();
  });

  test('curator sees the interpretation and matching cards', async ({ page }) => {
    await visitAssistant(page, { curator: true });

    const panel = page.getByRole('region', { name: 'Worlds assistant' });
    await expect(panel).toBeVisible();

    await ask(page, 'chill worlds for 4 people');

    await expect(panel.getByText(/interpreted as/i)).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Chill Lounge' })).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Dance Party' })).toHaveCount(0);
  });

  test('reports tags it could not match', async ({ page }) => {
    await visitAssistant(page, { curator: true });

    const panel = page.getByRole('region', { name: 'Worlds assistant' });
    await ask(page, 'zombie worlds');

    await expect(panel.getByText(/ignored unknown tags: zombie/i)).toBeVisible();
  });

  test('names the interpreted tags when nothing matches', async ({ page }) => {
    await visitAssistant(page, { curator: true });

    const panel = page.getByRole('region', { name: 'Worlds assistant' });
    await ask(page, 'kino worlds');

    await expect(panel.getByText(/no worlds matched the tags: kino/i)).toBeVisible();
    await expect(panel.getByRole('button', { name: /details -/i })).toHaveCount(0);
  });

  test('shows an error state with retry and no world list', async ({ page }) => {
    await visitAssistant(page, { curator: true });

    const panel = page.getByRole('region', { name: 'Worlds assistant' });
    await ask(page, 'trigger error');

    await expect(panel.getByText(/could not run the assistant/i)).toBeVisible();
    await expect(panel.getByRole('button', { name: /retry/i })).toBeVisible();
    await expect(panel.getByRole('button', { name: /details -/i })).toHaveCount(0);
  });

  test('View all in Worlds carries the sanitized query as a where param', async ({ page }) => {
    await visitAssistant(page, { curator: true });

    const panel = page.getByRole('region', { name: 'Worlds assistant' });
    await ask(page, 'chill worlds for 4 people');
    await expect(panel.getByText(/interpreted as/i)).toBeVisible();

    await panel.getByRole('button', { name: /view all in worlds/i }).click();
    await page.waitForURL(/\/worlds\?where=/);

    const where = new URL(page.url()).searchParams.get('where');
    expect(where).toBeTruthy();
    const decoded = JSON.parse(Buffer.from(where as string, 'base64url').toString('utf8')) as {
      groups: { connector: string; conditions: { field: string; op: string; value: string }[] }[];
    };
    expect(decoded.groups[0].conditions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'tag', op: 'has', value: 'chill' }),
        expect.objectContaining({ field: 'capacity', op: 'gte', value: '4' }),
      ]),
    );
  });

  test('curator does not see the panel on /worlds anymore', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });

    await expect(page.getByRole('heading', { name: 'Chill Lounge' }).first()).toBeVisible();
    await expect(page.getByRole('region', { name: 'Worlds assistant' })).toHaveCount(0);
    await expect(page.getByText('Worlds assistant')).toHaveCount(0);
  });
});
