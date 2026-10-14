import { describe, expect, it } from 'vitest';
import pkg from '../package.json';

const sources = import.meta.glob('./*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function relativeSpecifiers(source: string): string[] {
  const valueImports = source.replace(/(?:^|\n)\s*(?:import|export)\s+type\b[^;]*?;/g, '');
  return [...valueImports.matchAll(/\bfrom\s+['"](\.[^'"]+)['"]/g)].map((match) => match[1]);
}

const modules = Object.entries(sources).filter(([file]) => !file.endsWith('.test.ts'));

describe('api functions are valid ESM', () => {
  it('the package root is an ES module', () => {
    expect(pkg.type).toBe('module');
  });

  it('every module uses .js extensions on relative value imports', () => {
    for (const [file, source] of modules) {
      for (const specifier of relativeSpecifiers(source)) {
        expect(specifier, `${file} imports "${specifier}"`).toMatch(/\.js$/);
      }
    }
  });
});
