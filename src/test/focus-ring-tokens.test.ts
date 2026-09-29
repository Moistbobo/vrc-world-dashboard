import { globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const TRANSLUCENT_FOCUS_RING = /focus(?:-visible)?:ring-(?:indigo|rose|emerald)-\d+\/50/;
const GUARD_FILE = '/src/test/focus-ring-tokens.test.ts';

const projectRoot = process.cwd();

const sources = Object.fromEntries(
  globSync('src/**/*.{ts,tsx,css}', { cwd: projectRoot }).map((relativePath) => [
    `/${relativePath}`,
    readFileSync(resolve(projectRoot, relativePath), 'utf8'),
  ]),
);

describe('focus ring tokens', () => {
  it('reads the scanned sources from the real filesystem', () => {
    expect(sources['/src/index.css']?.length ?? 0).toBeGreaterThan(0);
  });

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
