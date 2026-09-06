import { expect, test } from '@playwright/test';
import { expandFilters, visitWorlds, waitForWorldsRequest } from './fixtures/worlds-harness';

/**
 * VR touch-target acceptance criteria (issue #207).
 * All measurements use getBoundingClientRect() on the rendered element.
 */

async function boxOf(locator: import('@playwright/test').Locator) {
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { width: r.width, height: r.height };
  });
}

test.describe('VR touch targets', () => {
  test.beforeEach(async ({ page }) => {
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid' });
  });

  test('filter chips (Tags, Quality, Platform, Date tagged) are >=48px tall', async ({ page }) => {
    // Quality chips are curator-only, so visit with an entered curator token.
    await visitWorlds(page, { scrollMode: 'pagination', viewMode: 'grid', curator: true });
    await expandFilters(page);

    const tagChip = page.getByRole('button', { name: /chill\s+\(\d+\)/ });
    const qualityChip = page.getByRole('button', { name: /good\s*\(\d+\)/i });
    const platformChip = page.getByTestId('platform-toggle-ios');
    const dateChip = page.getByTestId('day-range-preset-7');
    const flagChip = page.getByRole('button', { name: /furry\s+\(\d+\)/ });

    for (const chip of [tagChip, qualityChip, platformChip, dateChip, flagChip]) {
      const { height } = await boxOf(chip);
      expect(height, `chip height ${height}px`).toBeGreaterThanOrEqual(48);
    }
  });

  test('capacity slider thumbs are >=32x32px and the track is >=8px tall', async ({ page }) => {
    await expandFilters(page);

    const minThumb = page.getByRole('slider', { name: /minimum capacity/i });
    const maxThumb = page.getByRole('slider', { name: /maximum capacity/i });

    for (const [label, thumb] of [
      ['min', minThumb],
      ['max', maxThumb],
    ] as const) {
      const { width, height } = await boxOf(thumb);
      expect(width, `${label} thumb width ${width}px`).toBeGreaterThanOrEqual(32);
      expect(height, `${label} thumb height ${height}px`).toBeGreaterThanOrEqual(32);
    }

    const track = page.locator('[aria-label="Player capacity"] > span').first();
    const { height: trackHeight } = await boxOf(track);
    expect(trackHeight, `track height ${trackHeight}px`).toBeGreaterThanOrEqual(8);
  });

  test('dragging a slider thumb updates the filter and fires the worlds request', async ({ page }) => {
    await expandFilters(page);

    const thumb = page.getByRole('slider', { name: /minimum capacity/i });

    const req = waitForWorldsRequest(page, (url) => {
      const min = Number(url.searchParams.get('minCapacity'));
      return Number.isFinite(min) && min > 1;
    });

    const box = await thumb.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();

    const url = await req;
    expect(Number(url.searchParams.get('minCapacity'))).toBeGreaterThan(1);
  });

  test('active-filter pill X buttons have a >=24px hit area', async ({ page }) => {
    await page.goto('/worlds?tag=chill');
    await page.getByRole('heading', { name: 'Chill Lounge' }).waitFor();

    const pillX = page.getByRole('button', { name: /remove tag/i });
    await expect(pillX).toHaveCount(1);
    const { width, height } = await boxOf(pillX);
    expect(width, `pill X width ${width}px`).toBeGreaterThanOrEqual(24);
    expect(height, `pill X height ${height}px`).toBeGreaterThanOrEqual(24);
  });

  test('nav links, header buttons, and pagination buttons meet 44px minimum', async ({ page }) => {
    const navLink = page.getByRole('link', { name: /worlds/i }).first();
    const { height: navHeight } = await boxOf(navLink);
    expect(navHeight, `nav link height ${navHeight}px`).toBeGreaterThanOrEqual(44);

    const themeToggle = page.getByRole('button', { name: /toggle theme/i });
    const themeBox = await boxOf(themeToggle);
    expect(themeBox.width, `theme toggle width ${themeBox.width}px`).toBeGreaterThanOrEqual(44);
    expect(themeBox.height, `theme toggle height ${themeBox.height}px`).toBeGreaterThanOrEqual(44);

    const viewToggle = page.getByRole('button', { name: /grid view/i });
    const viewBox = await boxOf(viewToggle);
    expect(viewBox.width, `view toggle width ${viewBox.width}px`).toBeGreaterThanOrEqual(44);
    expect(viewBox.height, `view toggle height ${viewBox.height}px`).toBeGreaterThanOrEqual(44);
  });

  test('adjacent filter chips keep a >=8px visual gap', async ({ page }) => {
    await expandFilters(page);

    const chips = page.getByRole('button', { name: /chill\s+\(\d+\)/ });
    const social = page.getByRole('button', { name: /social\s+\(\d+\)/ });
    const gap = await chips.evaluate((el, other) => {
      const a = el.getBoundingClientRect();
      const b = (other as HTMLElement).getBoundingClientRect();
      return Math.abs(b.left - a.right);
    }, await social.elementHandle());
    expect(gap, `chip gap ${gap}px`).toBeGreaterThanOrEqual(8);
  });
});
