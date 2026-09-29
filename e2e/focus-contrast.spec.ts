import { expect, test, type Page } from '@playwright/test';
import { visitWorlds } from './fixtures/worlds-harness';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface FocusIndicator {
  focusVisible: boolean;
  outlineWidth: number;
  layers: { color: string; lengths: number[] }[];
  surface: string;
}

const GRID_OVERLAY = 'button[aria-label^="Details - "]';
const LIST_ROW = '.card[role="button"]';
const THEME_TOGGLE = 'button[aria-label="Toggle theme"]';

const SURFACE_BY_CASE: Record<'grid' | 'list', Record<'light' | 'dark', string>> = {
  grid: { light: 'rgb(255, 255, 255)', dark: 'rgb(30, 41, 59)' },
  list: { light: 'rgb(255, 255, 255)', dark: 'rgb(2, 6, 23)' },
};

function parseRgb(value: string): { rgb: Rgb; alpha: number } | null {
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) return null;
  const parts = match[1]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return null;
  return { rgb: { r: parts[0], g: parts[1], b: parts[2] }, alpha: parts[3] ?? 1 };
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

function composite(foreground: Rgb, alpha: number, background: Rgb): Rgb {
  return {
    r: Math.round(foreground.r * alpha + background.r * (1 - alpha)),
    g: Math.round(foreground.g * alpha + background.g * (1 - alpha)),
    b: Math.round(foreground.b * alpha + background.b * (1 - alpha)),
  };
}

async function settleMotion(page: Page): Promise<void> {
  await page.addStyleTag({
    content: '* { transition: none !important; animation: none !important; }',
  });
}

async function tabTo(page: Page, selector: string, maxPresses = 500): Promise<boolean> {
  for (let press = 0; press < maxPresses; press += 1) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(
      (sel) => document.activeElement?.matches(sel) ?? false,
      selector,
    );
    if (focused) return true;
  }
  return false;
}

async function readFocusIndicator(page: Page): Promise<FocusIndicator> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!(el instanceof HTMLElement)) throw new Error('no active element');

    const alphaOf = (color: string): number => {
      const match = color.match(/rgba?\(([^)]+)\)/);
      if (!match) return 0;
      const parts = match[1]
        .split(/[\s,/]+/)
        .filter(Boolean)
        .map(Number);
      return parts[3] ?? 1;
    };

    const style = getComputedStyle(el);
    const layers =
      style.boxShadow === 'none' || style.boxShadow === ''
        ? []
        : style.boxShadow.split(/,(?![^(]*\))/).map((segment) => ({
            color: segment.match(/rgba?\([^)]+\)/)?.[0] ?? '',
            lengths: (segment.match(/-?[\d.]+px/g) ?? []).map((value) => Number.parseFloat(value)),
          }));

    let node: Element | null = el.parentElement;
    let surface = 'rgb(0, 0, 0)';
    while (node) {
      const background = getComputedStyle(node).backgroundColor;
      if (alphaOf(background) > 0) {
        surface = background;
        break;
      }
      node = node.parentElement;
    }

    return {
      focusVisible: el.matches(':focus-visible'),
      outlineWidth: Number.parseFloat(style.outlineWidth) || 0,
      layers,
      surface,
    };
  });
}

function assertIndicatorContrast(label: string, indicator: FocusIndicator): void {
  expect(indicator.focusVisible, `${label}: keyboard focus should be :focus-visible`).toBe(true);

  const rings = indicator.layers
    .map((layer) => ({
      parsed: parseRgb(layer.color),
      spread: layer.lengths[3] ?? 0,
      lengths: layer.lengths,
    }))
    .filter(
      (layer) =>
        layer.parsed !== null &&
        layer.parsed.alpha > 0 &&
        layer.lengths[0] === 0 &&
        layer.lengths[1] === 0 &&
        layer.lengths[2] === 0,
    )
    .sort((a, b) => b.spread - a.spread);

  expect(
    rings.length > 0 || indicator.outlineWidth > 0,
    `${label}: no ring and no outline on the focused control`,
  ).toBe(true);
  if (rings.length === 0) return;

  const ring = rings[0].parsed!;
  const offset = rings[1] && rings[1].spread > 0 ? rings[1].parsed : undefined;
  const surface = parseRgb(indicator.surface);
  const adjacent = offset?.rgb ?? surface?.rgb;
  expect(adjacent, `${label}: could not resolve an adjacent surface`).toBeDefined();

  const composited = composite(ring.rgb, ring.alpha, adjacent!);
  expect(
    contrastRatio(composited, adjacent!),
    `${label}: focus indicator contrast`,
  ).toBeGreaterThanOrEqual(3);
}

for (const theme of ['light', 'dark'] as const) {
  for (const viewMode of ['grid', 'list'] as const) {
    test(`world ${viewMode} control clears 3:1 focus contrast (${theme})`, async ({ page }) => {
      await visitWorlds(page, { theme, viewMode, scrollMode: 'pagination' });
      await settleMotion(page);
      const selector = viewMode === 'grid' ? GRID_OVERLAY : LIST_ROW;
      expect(await tabTo(page, selector), `${selector} was not reachable by Tab`).toBe(true);

      expect(
        await page.evaluate(() => document.documentElement.classList.contains('dark')),
        `${theme} theme should be applied`,
      ).toBe(theme === 'dark');

      const indicator = await readFocusIndicator(page);
      expect(indicator.surface, `${viewMode}/${theme} adjacent surface`).toBe(
        SURFACE_BY_CASE[viewMode][theme],
      );
      assertIndicatorContrast(`${viewMode}/${theme}`, indicator);
    });
  }
}

for (const theme of ['light', 'dark'] as const) {
  test(`.btn ring clears 3:1 against its offset (${theme})`, async ({ page }) => {
    await visitWorlds(page, { theme, scrollMode: 'pagination' });
    await settleMotion(page);
    expect(await tabTo(page, THEME_TOGGLE), `${THEME_TOGGLE} was not reachable by Tab`).toBe(true);
    assertIndicatorContrast(`btn/${theme}`, await readFocusIndicator(page));
  });
}

test('a mouse click never leaves a keyboard focus-visible ring', async ({ page }) => {
  await visitWorlds(page, { theme: 'light', viewMode: 'grid', scrollMode: 'pagination' });
  await settleMotion(page);
  const overlay = page.locator(GRID_OVERLAY).first();
  await overlay.click();
  const pointerFocusVisible = await page.evaluate(
    () => document.activeElement?.matches(':focus-visible') ?? false,
  );
  expect(pointerFocusVisible).toBe(false);
});
