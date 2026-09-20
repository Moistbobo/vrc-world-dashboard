import { expect, test } from '@playwright/test';
import { expandFilters, visitWorlds, waitForWorldsRequest } from './fixtures/worlds-harness';

const allWorldNames = ['Chill Lounge', 'Dance Party', 'Quiet Study', 'Mobile Hangout'];

test.describe('Worlds page filters and search', () => {
  test.beforeEach(async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid' });
  });

  test('renders the full list and the search bar with no filters applied', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /worlds/i })).toBeVisible();
    for (const name of allWorldNames) {
      await expect(page.getByRole('heading', { name })).toBeVisible();
    }
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test.describe('Tag filter', () => {
    test('applies a tag filter from the filter bar and updates the URL', async ({ page }) => {
      await expandFilters(page);

      const req = waitForWorldsRequest(page, (url) => url.searchParams.get('tag') === 'chill');
      await page.getByRole('button', { name: /chill\s+\(\d+\)/ }).click();
      const url = await req;

      expect(url.searchParams.getAll('tag')).toEqual(['chill']);
      await expect(page.getByRole('heading', { name: 'Chill Lounge' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Quiet Study' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Dance Party' })).toHaveCount(0);
      await expect(page).toHaveURL(/[?&]tag=chill/);
    });

    test('removes the active tag via the X chip and clears the URL', async ({ page }) => {
      await page.goto('/worlds?tag=chill');
      await expect(page.getByRole('heading', { name: 'Chill Lounge' })).toBeVisible();

      const tagChip = page.locator('span', { hasText: 'chill' }).filter({ has: page.locator('button') }).first();
      await tagChip.locator('button').click();

      await expect(page).not.toHaveURL(/tag=chill/);
      for (const name of allWorldNames) {
        await expect(page.getByRole('heading', { name })).toBeVisible();
      }
    });
  });

  test.describe('Quality filter', () => {
    test('applies a quality filter and updates the URL', async ({ page }) => {
      // Quality chips are curator-only, so visit with an entered curator token.
      await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });
      await expandFilters(page);

      const req = waitForWorldsRequest(page, (url) => url.searchParams.get('quality') === 'good');
      await page.getByRole('button', { name: /good\s*\(2\)/i }).click();
      const url = await req;

      expect(url.searchParams.get('quality')).toBe('good');
      await expect(page).toHaveURL(/quality=good/);
      await expect(page.getByRole('heading', { name: 'Chill Lounge' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Dance Party' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Quiet Study' })).toHaveCount(0);
    });

    test('bad quality shows only bad worlds', async ({ page }) => {
      await page.goto('/worlds?quality=bad');
      await expect(page.getByRole('heading', { name: 'Quiet Study' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Chill Lounge' })).toHaveCount(0);
    });

    test('excludes rated worlds and hides the Good/Bad buttons', async ({ page }) => {
      await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });
      await expandFilters(page);

      const req = waitForWorldsRequest(page, (url) => url.searchParams.get('qualityMode') === 'exclude');
      await page.getByTestId('quality-exclude-toggle').check();
      const url = await req;

      expect(url.searchParams.get('qualityMode')).toBe('exclude');
      expect(url.searchParams.get('quality')).toBeNull();
      await expect(page).toHaveURL(/qualityMode=exclude/);
      await expect(page.getByRole('heading', { name: 'Mobile Hangout' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Priority Watch' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Chill Lounge' })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Dance Party' })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Quiet Study' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /good\s*\(/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /bad\s*\(/i })).toHaveCount(0);
    });

    test('applying Good then excluding rated worlds drops the quality filter', async ({ page }) => {
      await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });
      await expandFilters(page);

      const goodReq = waitForWorldsRequest(page, (url) => url.searchParams.get('quality') === 'good');
      await page.getByRole('button', { name: /good\s*\(2\)/i }).click();
      await goodReq;

      const excludeReq = waitForWorldsRequest(
        page,
        (url) => url.searchParams.get('qualityMode') === 'exclude',
      );
      await page.getByTestId('quality-exclude-toggle').check();
      const url = await excludeReq;

      expect(url.searchParams.get('qualityMode')).toBe('exclude');
      expect(url.searchParams.get('quality')).toBeNull();
      await expect(page).not.toHaveURL(/quality=good/);
      await expect(page.getByRole('button', { name: /good\s*\(/i })).toHaveCount(0);
    });

    test('keeps the high-priority control working while exclude is on', async ({ page }) => {
      await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });
      await expandFilters(page);

      await page.getByTestId('quality-exclude-toggle').check();
      await expect(page).toHaveURL(/qualityMode=exclude/);

      const req = waitForWorldsRequest(
        page,
        (url) =>
          url.searchParams.get('qualityMode') === 'exclude' &&
          url.searchParams.get('highPriority') === 'true',
      );
      await page.getByRole('button', { name: /^high priority\s*\(3\)/i }).click();
      const url = await req;

      expect(url.searchParams.get('qualityMode')).toBe('exclude');
      expect(url.searchParams.get('highPriority')).toBe('true');
      await expect(page.getByRole('heading', { name: 'Priority Watch' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Mobile Hangout' })).toHaveCount(0);
    });

    test('deep-links to the exclude mode with a curator token', async ({ page }) => {
      const req = waitForWorldsRequest(page, (url) => url.searchParams.get('qualityMode') === 'exclude');
      await visitWorlds(page, {
        scrollMode: 'pagination',
        viewMode: 'grid',
        curator: true,
        queryString: '?qualityMode=exclude',
      });
      const url = await req;

      expect(url.searchParams.get('qualityMode')).toBe('exclude');
      expect(url.searchParams.get('quality')).toBeNull();
      await expandFilters(page);
      await expect(page.getByTestId('quality-exclude-toggle')).toBeChecked();
      await expect(page.getByRole('button', { name: /good\s*\(/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /bad\s*\(/i })).toHaveCount(0);
    });
  });

  test.describe('High priority filter', () => {
    test('applies the high-priority toggle and updates the URL', async ({ page }) => {
      await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });
      await expandFilters(page);

      const req = waitForWorldsRequest(page, (url) => url.searchParams.get('highPriority') === 'true');
      await page.getByRole('button', { name: /high priority\s*\(3\)/i }).click();
      const url = await req;

      expect(url.searchParams.get('highPriority')).toBe('true');
      await expect(page).toHaveURL(/highPriority=true/);
      await expect(page.getByRole('heading', { name: 'Chill Lounge' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Dance Party' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Quiet Study' })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Mobile Hangout' })).toHaveCount(0);
    });

    test('viewers see no curator section and no high-priority toggle', async ({ page }) => {
      await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid' });
      await expandFilters(page);

      await expect(page.getByRole('button', { name: /high priority/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /good/i })).toHaveCount(0);
    });

    test('shows the high-priority chip in the collapsed bar only while the filter is active', async ({ page }) => {
      await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });

      await expect(page.getByRole('button', { name: /remove high priority/i })).toHaveCount(0);

      await expandFilters(page);
      const onReq = waitForWorldsRequest(page, (url) => url.searchParams.get('highPriority') === 'true');
      await page.getByRole('button', { name: /^high priority\s*\(3\)/i }).click();
      await onReq;

      await page.getByTestId('filter-bar-header').click();
      await expect(page.getByRole('button', { name: /remove high priority/i })).toBeVisible();

      const offReq = waitForWorldsRequest(page, (url) => url.searchParams.get('highPriority') === null);
      await page.getByRole('button', { name: /remove high priority/i }).click();
      await offReq;

      await expect(page).not.toHaveURL(/highPriority=true/);
      await expect(page.getByRole('button', { name: /remove high priority/i })).toHaveCount(0);
    });
  });

  test.describe('Platform filter', () => {
    test('applies a platform filter and updates the URL', async ({ page }) => {
      await expandFilters(page);

      const req = waitForWorldsRequest(page, (url) => url.searchParams.get('platform') === 'ios');
      await page.getByTestId('platform-toggle-ios').click();
      const url = await req;

      expect(url.searchParams.getAll('platform')).toEqual(['ios']);
      await expect(page).toHaveURL(/platform=ios/);
      await expect(page.getByRole('heading', { name: 'Quiet Study' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Chill Lounge' })).toHaveCount(0);
    });

    test('combines two platforms via repeated selection', async ({ page }) => {
      await page.goto('/worlds?platform=android&platform=ios');
      await expandFilters(page);

      await expect(page.getByTestId('platform-toggle-android')).toHaveAttribute(
        'class',
        /border-indigo-500/,
      );
      await expect(page.getByTestId('platform-toggle-ios')).toHaveAttribute(
        'class',
        /border-indigo-500/,
      );
      await expect(page).toHaveURL(/platform=android/);
      await expect(page).toHaveURL(/platform=ios/);
    });

    test('removes a platform via the active chip X', async ({ page }) => {
      await page.goto('/worlds?platform=ios');

      const iosChip = page.locator('span', { hasText: 'iOS' }).filter({ has: page.locator('button') }).first();
      await iosChip.locator('button').click();
      await expect(page).not.toHaveURL(/platform=ios/);
    });
  });

  test.describe('Capacity filter', () => {
    test('applies a capacity range and updates the URL', async ({ page }) => {
      await expandFilters(page);

      const minInput = page.getByRole('spinbutton', { name: /minimum capacity/i });
      const maxInput = page.getByRole('spinbutton', { name: /maximum capacity/i });

      await minInput.fill('20');
      await minInput.blur();
      await maxInput.fill('30');
      await maxInput.blur();

      await expect(page).toHaveURL(/minCapacity=20/);
      await expect(page).toHaveURL(/maxCapacity=30/);
      await expect(page.getByRole('heading', { name: 'Dance Party' })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Quiet Study' })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Chill Lounge' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Mobile Hangout' })).toBeVisible();
    });

    test('removes the capacity range via the active chip X', async ({ page }) => {
      await page.goto('/worlds?minCapacity=20&maxCapacity=30');
      await expect(page.getByText(/20–30/)).toBeVisible();

      await page.getByRole('button', { name: /remove capacity filter/i }).click();
      await expect(page).not.toHaveURL(/minCapacity/);
      await expect(page).not.toHaveURL(/maxCapacity/);
    });
  });

  test.describe('Day range filter', () => {
    test('applies a preset day range and updates the URL', async ({ page }) => {
      await expandFilters(page);

      const req = waitForWorldsRequest(page, (url) => url.searchParams.get('dayRange') === '7');
      await page.getByTestId('day-range-preset-7').click();
      const url = await req;

      expect(url.searchParams.get('dayRange')).toBe('7');
      await expect(page).toHaveURL(/dayRange=7/);
      await expect(page.getByRole('heading', { name: 'Chill Lounge' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Dance Party' })).toHaveCount(0);
    });

    test('typing a custom day range value updates the URL', async ({ page }) => {
      await expandFilters(page);

      const req = waitForWorldsRequest(page, (url) => url.searchParams.get('dayRange') === '14');
      const input = page.getByRole('spinbutton', { name: /custom/i });
      await input.fill('14');
      await req;

      await expect(page).toHaveURL(/dayRange=14/);
    });

    test('clearing the custom day range value removes the param', async ({ page }) => {
      await page.goto('/worlds?dayRange=45');
      await page.getByPlaceholder(/search/i).waitFor();
      await expandFilters(page);

      const customInput = page.getByRole('spinbutton', { name: /custom/i });
      await expect(customInput).toHaveValue('45');

      const req = waitForWorldsRequest(
        page,
        (url) => !url.searchParams.has('dayRange') && url.searchParams.get('limit') === '20',
      );
      await customInput.fill('');
      await req;

      await expect(page).not.toHaveURL(/dayRange/);
    });
  });

  test.describe('Search bar', () => {
    test('typing in the search bar debounces and updates the URL', async ({ page }) => {
      const search = page.getByPlaceholder(/search/i);
      await search.click();

      const req = waitForWorldsRequest(page, (url) => url.searchParams.get('search') === 'Dance');
      await search.fill('Dance');
      await req;

      await expect(page).toHaveURL(/search=Dance/);
      await expect(page.getByRole('heading', { name: 'Dance Party' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Chill Lounge' })).toHaveCount(0);
    });

    test('search matches author name and world name', async ({ page }) => {
      await page.goto('/worlds?search=Raver');
      await expect(page.getByRole('heading', { name: 'Dance Party' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Chill Lounge' })).toHaveCount(0);
    });

    test('clearing the search bar removes the URL param', async ({ page }) => {
      await page.goto('/worlds?search=Dance');
      const search = page.getByPlaceholder(/search/i);
      await expect(search).toHaveValue('Dance');

      const req = waitForWorldsRequest(
        page,
        (url) => !url.searchParams.has('search'),
      );
      await search.fill('');
      await req;

      await expect(page).not.toHaveURL(/search=/);
      for (const name of allWorldNames) {
        await expect(page.getByRole('heading', { name })).toBeVisible();
      }
    });
  });

  test.describe('Combined filters and clear all', () => {
    test('combines tag + quality + platform + day range + search and updates the URL', async ({
      page,
    }) => {
      await page.goto('/worlds?tag=chill&quality=good&platform=android&search=Chill&dayRange=30');

      await expect(page).toHaveURL(/tag=chill/);
      await expect(page).toHaveURL(/quality=good/);
      await expect(page).toHaveURL(/platform=android/);
      await expect(page).toHaveURL(/dayRange=30/);
      await expect(page).toHaveURL(/search=Chill/);
      await expect(page.getByRole('heading', { name: 'Chill Lounge' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Quiet Study' })).toHaveCount(0);
    });

    test('clicking Clear all resets every filter and the URL', async ({ page }) => {
      await page.goto(
        '/worlds?tag=chill&quality=good&platform=android&minCapacity=10&maxCapacity=30&dayRange=7&search=Chill',
      );
      await page.getByPlaceholder(/search/i).waitFor();
      await expandFilters(page);

      const cleared = waitForWorldsRequest(
        page,
        (url) =>
          !url.searchParams.has('tag') &&
          !url.searchParams.has('quality') &&
          !url.searchParams.has('platform') &&
          !url.searchParams.has('dayRange') &&
          !url.searchParams.has('search'),
      );
      await page.getByRole('button', { name: /clear all/i }).click();
      await cleared;

      await expect(page).toHaveURL(/\/worlds$/);
      for (const name of allWorldNames) {
        await expect(page.getByRole('heading', { name })).toBeVisible();
      }
    });
  });
});
