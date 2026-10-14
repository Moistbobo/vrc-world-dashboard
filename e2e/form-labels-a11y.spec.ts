import { expect, test } from '@playwright/test';
import { mockApi } from './fixtures/mock-api';
import { expandFilters, visitWorlds } from './fixtures/worlds-harness';

test.describe('form labels and error association', () => {
  test('names every filter group', async ({ page }) => {
    await visitWorlds(page, { curator: true });
    await expandFilters(page);

    for (const name of [
      /^tags$/i,
      /^flags$/i,
      /^platforms$/i,
      /player capacity/i,
      /date tagged/i,
      /^curator$/i,
    ]) {
      await expect(page.getByRole('group', { name })).toBeVisible();
    }
  });

  test('names the settings token field and links its status text', async ({ page }) => {
    await mockApi(page);
    await page.goto('/settings');

    const input = page.getByLabel(/api token/i);
    await expect(input).toHaveAttribute('autocomplete', 'off');

    const status = page.getByRole('status');
    await expect(status).toBeVisible();
    const statusId = await status.getAttribute('id');
    expect(await input.getAttribute('aria-describedby')).toContain(statusId);
  });

  test('list form announces an empty-name error and clears it on input', async ({ page }) => {
    await mockApi(page);
    await page.goto('/lists');

    await page.getByRole('button', { name: /new list/i }).click();
    const dialog = page.getByRole('dialog');
    const name = dialog.getByRole('textbox', { name: /name/i });
    await dialog.getByRole('button', { name: /create list/i }).click();

    const alert = dialog.getByRole('alert');
    await expect(alert).toBeVisible();
    const alertId = await alert.getAttribute('id');
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveAttribute('aria-describedby', alertId);

    await name.fill('Favorites');
    await expect(alert).toBeHidden();
    await expect(name).toHaveAttribute('aria-invalid', 'false');
  });

  test('import dialog announces errors and links them to the file input', async ({ page }) => {
    await mockApi(page);
    await page.goto('/lists');

    await page.getByRole('button', { name: /^import$/i }).click();
    const dialog = page.getByRole('dialog');
    const fileInput = dialog.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('not json'),
    });

    const alert = dialog.getByRole('alert');
    await expect(alert).toHaveText(/not valid json/i);
    const alertId = await alert.getAttribute('id');
    await expect(fileInput).toHaveAttribute('aria-describedby', alertId);
  });
});
