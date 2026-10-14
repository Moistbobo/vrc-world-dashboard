import { describe, expect, it } from 'vitest';
import { composite, contrastRatio, hexToRgb, type Rgb } from './focusContrast';

const SURFACES: Record<string, Rgb> = {
  white: hexToRgb('#ffffff'),
  'slate-850': hexToRgb('#1e293b'),
  'slate-900': hexToRgb('#0f172a'),
  'slate-950': hexToRgb('#020617'),
};

const RING_COLORS: Record<string, Rgb> = {
  'indigo-500': hexToRgb('#6366f1'),
  'rose-500': hexToRgb('#f43f5e'),
  'emerald-600': hexToRgb('#059669'),
};

describe('focus indicator contrast', () => {
  it('every shipped ring color clears 3:1 against every app surface', () => {
    for (const [ringName, ring] of Object.entries(RING_COLORS)) {
      for (const [surfaceName, surface] of Object.entries(SURFACES)) {
        expect(
          contrastRatio(ring, surface),
          `${ringName} vs ${surfaceName}`,
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('documents the 50 percent alpha regression this ticket fixes', () => {
    const translucent = composite(RING_COLORS['indigo-500'], 0.5, SURFACES.white);
    expect(contrastRatio(translucent, SURFACES.white)).toBeLessThan(3);
  });

  it('keeps the emerald-500 ring out, since it misses 3:1 on white', () => {
    expect(contrastRatio(hexToRgb('#10b981'), SURFACES.white)).toBeLessThan(3);
  });
});
