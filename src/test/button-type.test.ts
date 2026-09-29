/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const srcDir = join(process.cwd(), 'src');

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsxFiles(path));
    else if (entry.name.endsWith('.tsx')) out.push(path);
  }
  return out;
}

/**
 * Scan JSX opening tags with brace tracking so arrow-function attributes
 * (which contain `>`) do not truncate the tag and hide an earlier `type=`.
 */
export function buttonsMissingType(source: string): number[] {
  const lines: number[] = [];
  const needle = '<button';
  let i = 0;
  while ((i = source.indexOf(needle, i)) !== -1) {
    const after = source[i + needle.length];
    if (after === undefined || !/[\s/>]/.test(after)) {
      i += needle.length;
      continue;
    }
    let depth = 0;
    let end = source.length;
    for (let j = i + needle.length; j < source.length; j++) {
      const char = source[j];
      if (char === '{') depth++;
      else if (char === '}') depth--;
      else if (char === '>' && depth === 0) {
        end = j;
        break;
      }
    }
    const tag = source.slice(i, end + 1);
    if (!/\btype\s*=/.test(tag)) {
      lines.push(source.slice(0, i).split('\n').length);
    }
    i = end + 1;
  }
  return lines;
}

describe('button type attribute', () => {
  it('every <button> in src/**/*.tsx declares an explicit type', () => {
    const offenders: string[] = [];
    for (const file of tsxFiles(srcDir)) {
      const source = readFileSync(file, 'utf8');
      const rel = file.slice(srcDir.length).replace(/\\/g, '/');
      for (const line of buttonsMissingType(source)) {
        offenders.push(`src/${rel}:${line}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('detects a missing type behind an arrow-function attribute', () => {
    expect(buttonsMissingType('<button onClick={() => go()}>x</button>')).toEqual([1]);
    expect(buttonsMissingType('<button type="button" onClick={() => go()}>x</button>')).toEqual([]);
  });
});
