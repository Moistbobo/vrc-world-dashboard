import { describe, it, expect } from 'vitest';

const WHITE = '#ffffff';
const CARD = '#1e293b';
const BODY = '#020617';
const INPUT = '#0f172a';
const TAG_FILL_ALPHA = 0.15;
const MIN_RATIO = 4.5;

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

function srgbToLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => srgbToLinear(channel / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string): number {
  const values = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function compositeOver(color: string, alpha: number, over: string): string {
  const fg = hexToRgb(color);
  const bg = hexToRgb(over);
  return rgbToHex(fg.map((channel, index) => Math.round(channel * alpha + bg[index] * (1 - alpha))) as Rgb);
}

function assertPairs(pairs: Array<[string, string, string]>): void {
  for (const [label, foreground, background] of pairs) {
    expect(contrastRatio(foreground, background), label).toBeGreaterThanOrEqual(MIN_RATIO);
  }
}

const TAG_PALETTE: Array<{ hex: string; fill: string; light: string; dark: string }> = [
  { hex: '#8b5cf6', fill: '#8b5cf6', light: '#6d28d9', dark: '#c4b5fd' },
  { hex: '#a78bfa', fill: '#8b5cf6', light: '#6d28d9', dark: '#c4b5fd' },
  { hex: '#06b6d4', fill: '#06b6d4', light: '#0e7490', dark: '#67e8f9' },
  { hex: '#d946ef', fill: '#d946ef', light: '#a21caf', dark: '#f0abfc' },
  { hex: '#f59e0b', fill: '#f59e0b', light: '#92400e', dark: '#f59e0b' },
  { hex: '#c084fc', fill: '#a855f7', light: '#7e22ce', dark: '#d8b4fe' },
  { hex: '#a855f7', fill: '#a855f7', light: '#7e22ce', dark: '#d8b4fe' },
  { hex: '#fb923c', fill: '#f97316', light: '#9a3412', dark: '#fb923c' },
  { hex: '#f97316', fill: '#f97316', light: '#9a3412', dark: '#fb923c' },
  { hex: '#f43f5e', fill: '#f43f5e', light: '#be123c', dark: '#fda4af' },
  { hex: '#fb7185', fill: '#f43f5e', light: '#be123c', dark: '#fda4af' },
  { hex: '#6366f1', fill: '#6366f1', light: '#4338ca', dark: '#a5b4fc' },
  { hex: '#facc15', fill: '#facc15', light: '#a16207', dark: '#facc15' },
  { hex: '#14b8a6', fill: '#14b8a6', light: '#0f766e', dark: '#2dd4bf' },
  { hex: '#ef4444', fill: '#ef4444', light: '#b91c1c', dark: '#fca5a5' },
  { hex: '#0ea5e9', fill: '#0ea5e9', light: '#0369a1', dark: '#38bdf8' },
  { hex: '#38bdf8', fill: '#0ea5e9', light: '#0369a1', dark: '#38bdf8' },
  { hex: '#3b82f6', fill: '#3b82f6', light: '#1d4ed8', dark: '#93c5fd' },
  { hex: '#84cc16', fill: '#84cc16', light: '#4d7c0f', dark: '#a3e635' },
  { hex: '#94a3b8', fill: '#64748b', light: '#334155', dark: '#cbd5e1' },
  { hex: '#64748b', fill: '#64748b', light: '#334155', dark: '#cbd5e1' },
  { hex: '#ec4899', fill: '#ec4899', light: '#be185d', dark: '#f9a8d4' },
];

describe('WCAG contrast', () => {
  it('passes the muted text token in both themes', () => {
    assertPairs([
      ['muted light', '#64748b', WHITE],
      ['muted dark on card', '#94a3b8', CARD],
      ['muted dark on body', '#94a3b8', BODY],
      ['muted dark on input', '#94a3b8', INPUT],
    ]);
  });

  it('passes the quality badge fills', () => {
    assertPairs([
      ['high priority', WHITE, '#15803d'],
      ['sensitive', WHITE, '#b91c1c'],
      ['moderate', WHITE, '#b45309'],
    ]);
  });

  it('passes the rating bar percentages', () => {
    assertPairs([
      ['good light', '#047857', WHITE],
      ['good dark', '#34d399', CARD],
      ['bad light', '#e11d48', WHITE],
      ['bad dark', '#fb7185', CARD],
    ]);
  });

  it('passes every tag palette entry in both themes', () => {
    for (const entry of TAG_PALETTE) {
      const lightBackground = compositeOver(entry.fill, TAG_FILL_ALPHA, WHITE);
      const darkBackground = compositeOver(entry.fill, TAG_FILL_ALPHA, CARD);
      expect(contrastRatio(entry.light, lightBackground), `${entry.hex} light`).toBeGreaterThanOrEqual(
        MIN_RATIO,
      );
      expect(contrastRatio(entry.dark, darkBackground), `${entry.hex} dark`).toBeGreaterThanOrEqual(
        MIN_RATIO,
      );
    }
  });

  it('passes the exclude tag variant in both themes', () => {
    const lightBackground = compositeOver('#f43f5e', TAG_FILL_ALPHA, WHITE);
    const darkBackground = compositeOver('#f43f5e', TAG_FILL_ALPHA, CARD);
    expect(contrastRatio('#be123c', lightBackground)).toBeGreaterThanOrEqual(MIN_RATIO);
    expect(contrastRatio('#fda4af', darkBackground)).toBeGreaterThanOrEqual(MIN_RATIO);
  });
});
