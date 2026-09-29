import { expect, test } from '@playwright/test';
import { mockApi } from './fixtures/mock-api';
import { visitWorlds } from './fixtures/worlds-harness';

/**
 * AC-4: card grids expose list semantics. Virtualized grids cannot render real
 * list elements, so the containers carry role="list" and each rendered card or
 * row carries role="listitem" with aria-posinset/aria-setsize.
 */

test.describe('card grid list semantics', () => {
  test('/worlds grid exposes each world as a list item', async ({ page }) => {
    await visitWorlds(page, { viewMode: 'grid' });

    const list = page.getByRole('list');
    await expect(list).toBeVisible();

    const firstItem = page.getByRole('listitem').first();
    await expect(firstItem).toHaveAttribute('aria-posinset', '1');
    await expect(firstItem).toHaveAttribute('aria-setsize', /^\d+$/);
  });

  test('/worlds list view exposes each row as a list item', async ({ page }) => {
    await visitWorlds(page, { viewMode: 'list' });

    await expect(page.getByRole('list')).toBeVisible();
    await expect(page.getByRole('listitem').first()).toHaveAttribute('aria-posinset', '1');
  });

  test('/tags exposes the tag grid as a list', async ({ page }) => {
    await mockApi(page);
    await page.goto('/tags');
    await page.getByRole('heading', { name: /tags/i }).waitFor();

    await expect(page.getByRole('list')).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(4);
  });

  test('/lists exposes the list grid as a list after creating a list', async ({ page }) => {
    await mockApi(page);
    await page.goto('/lists');
    await page.getByRole('heading', { name: /my lists/i }).waitFor();

    await page.getByRole('button', { name: 'New list' }).click();
    await page.getByLabel('List name').fill('Favorites');
    await page.getByRole('button', { name: 'Create list' }).click();

    await expect(page.getByRole('list')).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(1);
  });
});
