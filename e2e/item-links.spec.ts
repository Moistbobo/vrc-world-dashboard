import { expect, test, type Locator, type Page } from '@playwright/test';
import { mockApi } from './fixtures/mock-api';
import { seedStoredToken, visitWorlds } from './fixtures/worlds-harness';

const WORLD_NAMES = [
  'Chill Lounge',
  'Dance Party',
  'Quiet Study',
  'Mobile Hangout',
  'Priority Watch',
];

const TAG_NAMES = ['chill', 'dance', 'social', 'study'];

async function countNestedInteractive(page: Page): Promise<number> {
  return page.evaluate(() => {
    const selector =
      'a[href], button, input, select, textarea, [role="button"], [role="link"]';
    const root = document.querySelector('#main') ?? document.body;
    const interactive = Array.from(root.querySelectorAll(selector));
    return interactive.filter((el) => {
      let parent = el.parentElement;
      while (parent) {
        if (parent.matches(selector)) return true;
        parent = parent.parentElement;
      }
      return false;
    }).length;
  });
}

async function ariaControlsIds(toggles: Locator): Promise<string[]> {
  await expect(toggles.first()).toBeVisible();
  const count = await toggles.count();
  const ids: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const toggle = toggles.nth(i);
    await toggle.click();
    const id = await toggle.getAttribute('aria-controls');
    expect(id, `flag toggle ${i} has an aria-controls target`).not.toBeNull();
    ids.push(id as string);
  }
  return ids;
}

test.describe('item cards as links', () => {
  test('world list rows expose a single link action with no nested interactive elements', async ({
    page,
  }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'list' });

    expect(await countNestedInteractive(page)).toBe(0);

    for (const name of WORLD_NAMES) {
      await expect(page.getByRole('link', { name, exact: true })).toHaveCount(1);
    }
  });

  test('world grid cards expose a link action with no nested interactive elements', async ({
    page,
  }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid' });

    expect(await countNestedInteractive(page)).toBe(0);

    for (const name of WORLD_NAMES) {
      await expect(page.getByRole('link', { name: new RegExp(name) })).toHaveCount(1);
    }
  });

  test('tag cards are links and no interactive element nests inside another', async ({ page }) => {
    await seedStoredToken(page);
    await mockApi(page);
    await page.goto('/tags');

    await page.getByRole('heading', { name: /tags/i }).waitFor();
    for (const tag of TAG_NAMES) {
      await expect(page.getByRole('link', { name: tag, exact: true })).toHaveAttribute(
        'href',
        `/worlds?tag=${tag}`,
      );
    }

    expect(await countNestedInteractive(page)).toBe(0);
  });

  test('pressing Enter on the first world row link navigates to its detail page', async ({
    page,
  }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'list' });

    const rowLink = page.locator('a[aria-label]:not([aria-label^="Details - "])').first();
    await expect(rowLink).toBeVisible();
    const href = await rowLink.getAttribute('href');
    expect(href).toMatch(/^\/worlds\/.+/);

    await rowLink.focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });

  test('pressing Enter on a list card link opens the list', async ({ page }) => {
    await seedStoredToken(page);
    await mockApi(page);
    await page.goto('/lists');

    await page.getByRole('button', { name: /new list/i }).click();
    await page.getByRole('textbox', { name: /name/i }).fill('Keyboard List');
    await page.getByRole('button', { name: /create list/i }).click();

    const listLink = page.getByRole('link', { name: 'Keyboard List', exact: true });
    const href = await listLink.getAttribute('href');
    expect(href).toMatch(/^\/lists\/.+/);

    await listLink.focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });

  test('aria-controls target ids are unique across expanded list rows', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'list' });
    const ids = await ariaControlsIds(page.getByRole('button', { name: 'Show flags' }));
    expect(ids.length).toBeGreaterThan(1);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
    }
  });

  test('aria-controls target ids are unique across expanded grid cards', async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid' });
    const ids = await ariaControlsIds(page.getByRole('button', { name: 'Show flags' }));
    expect(ids.length).toBeGreaterThan(1);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
    }
  });
});
