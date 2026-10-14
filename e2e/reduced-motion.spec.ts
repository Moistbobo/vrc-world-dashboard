import { expect, test } from '@playwright/test';
import { mockApi } from './fixtures/mock-api';

test.use({ reducedMotion: 'reduce' });

/**
 * AC-1: with prefers-reduced-motion: reduce, decorative animation and long
 * transitions stop. The global rule in src/index.css is the mechanism, so the
 * probes exercise the exact utility classes the app ships.
 *
 * Assert the computed contract (duration pinned to .01ms, iteration count 1)
 * rather than a running-animation count. The global transition-duration rule
 * spins up transient CSSTransitions on initial style recalc, so an immediate
 * getAnimations() count races that settling window.
 */

function toSeconds(value: string): number {
  return Math.max(
    ...value.split(',').map((part) => {
      const token = part.trim();
      return token.endsWith('ms') ? parseFloat(token) / 1000 : parseFloat(token);
    }),
  );
}

test.describe('prefers-reduced-motion', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('neutralizes animation and transition for the shipped utility classes', async ({ page }) => {
    await mockApi(page);
    await page.goto('/worlds');
    await page.getByRole('heading', { name: /worlds/i }).waitFor();

    const matches = await page.evaluate(
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    expect(matches, 'emulated reduced-motion media query').toBe(true);

    const probes = await page.evaluate(() => {
      const classes = [
        'animate-pulse',
        'animate-spin',
        'animate-shimmer',
        'transition-all duration-300',
      ];
      return classes.map((cls) => {
        const el = document.createElement('div');
        el.className = cls;
        document.body.appendChild(el);
        const style = getComputedStyle(el);
        return {
          cls,
          animationDuration: style.animationDuration,
          animationIterationCount: style.animationIterationCount,
          transitionDuration: style.transitionDuration,
        };
      });
    });

    for (const probe of probes) {
      expect(
        toSeconds(probe.animationDuration),
        `${probe.cls} animation duration`,
      ).toBeLessThanOrEqual(0.011);
      expect(probe.animationIterationCount, `${probe.cls} animation iteration count`).toBe('1');
      expect(
        toSeconds(probe.transitionDuration),
        `${probe.cls} transition duration`,
      ).toBeLessThanOrEqual(0.011);
    }
  });

  test('the real loading skeleton does not animate', async ({ page }) => {
    await mockApi(page);
    await page.route(/\/api\/worlds(?:\?.*)?$/, async (route) => {
      if (new URL(route.request().url()).pathname !== '/api/worlds') {
        return route.fallback();
      }
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      return route.fallback();
    });

    await page.goto('/worlds');

    const skeleton = page.locator('.animate-pulse').first();
    await expect(skeleton).toBeVisible();

    const state = await skeleton.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        animationDuration: style.animationDuration,
        animationIterationCount: style.animationIterationCount,
        transitionDuration: style.transitionDuration,
      };
    });

    expect(
      toSeconds(state.animationDuration),
      'skeleton animation duration',
    ).toBeLessThanOrEqual(0.011);
    expect(state.animationIterationCount, 'skeleton animation iteration count').toBe('1');
    expect(
      toSeconds(state.transitionDuration),
      'skeleton transition duration',
    ).toBeLessThanOrEqual(0.011);
  });
});
