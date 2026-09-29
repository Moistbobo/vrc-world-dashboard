import { describe, expect, it } from 'vitest';

const TRANSLUCENT_FOCUS_RING = /focus(?:-visible)?:ring-(?:indigo|rose|emerald)-\d+\/50/;
const GUARD_FILE = '/src/test/focus-ring-tokens.test.ts';

const sources = import.meta.glob<string>('/src/**/*.{ts,tsx,css}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

describe('focus ring tokens', () => {
  it('no focus ring uses a 50 percent alpha that composites below 3:1', () => {
    const offenders = Object.entries(sources)
      .filter(([file]) => file !== GUARD_FILE)
      .flatMap(([file, source]) => {
        const lineIndex = source.split('\n').findIndex((line) => TRANSLUCENT_FOCUS_RING.test(line));
        return lineIndex === -1 ? [] : [`${file.replace('/src/', '')}:${lineIndex + 1}`];
      });

    expect(offenders).toEqual([]);
  });
});
