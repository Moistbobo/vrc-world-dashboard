import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pattern = /import\.meta\.env\.VITE_([A-Z0-9_]+)/g;

const files = globSync('src/**/*.{ts,tsx}', { cwd: root, absolute: true });
let changed = 0;

for (const file of files) {
  const before = readFileSync(file, 'utf8');
  const after = before.replace(pattern, 'process.env.NEXT_PUBLIC_$1');
  if (after !== before) {
    writeFileSync(file, after);
    changed += 1;
    console.log(path.relative(root, file));
  }
}

console.log(`updated ${changed} file(s)`);
