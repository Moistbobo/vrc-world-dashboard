// Drives a recording of the worlds filters/search end-to-end for PR evidence.
// Uses the same fixtures and route handlers as e2e/fixtures/, but stays in JS
// to avoid needing a TS loader. Output goes to pr-assets/<branch>/.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const APP_PORT = 5180;
const outDir = path.join(REPO, 'pr-assets', 'feat-e2e-worlds-filters');

const worlds = [
  { worldId: 'wrld_chill_lounge', name: 'Chill Lounge', authorName: 'Tester', capacity: 20, platforms: ['standalonewindows', 'android'], tags: ['chill', 'social'], imageUrl: '', vrchatUrl: '', quality: 'good', createdAt: '2024-01-01', internalAddDate: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10) },
  { worldId: 'wrld_dance_party', name: 'Dance Party', authorName: 'Raver', capacity: 50, platforms: ['standalonewindows'], tags: ['dance', 'social'], imageUrl: '', vrchatUrl: '', quality: 'good', createdAt: '2024-01-15', internalAddDate: '2024-02-10' },
  { worldId: 'wrld_quiet_study', name: 'Quiet Study', authorName: 'Scholar', capacity: 10, platforms: ['android', 'ios'], tags: ['chill', 'study'], imageUrl: '', vrchatUrl: '', quality: 'bad', createdAt: '2024-02-01', internalAddDate: '2024-02-20' },
  { worldId: 'wrld_mobile_only', name: 'Mobile Hangout', authorName: 'Tester', capacity: 30, platforms: ['android'], tags: ['social'], imageUrl: '', vrchatUrl: '', quality: null, createdAt: '2024-02-15', internalAddDate: '2024-02-25' },
];
const tagsResponse = {
  tags: [
    { tag: 'chill', count: 2 },
    { tag: 'dance', count: 1 },
    { tag: 'social', count: 3 },
    { tag: 'study', count: 1 },
  ],
};
const metaResponse = {
  qualityGood: 2,
  qualityBad: 1,
  platformDesktop: 2,
  platformAndroid: 3,
  platformiOS: 1,
};

function parseList(value) {
  return value ? value.split(',').filter(Boolean) : [];
}

function filterWorlds(query) {
  const search = (query.get('search') ?? '').trim().toLowerCase();
  const tags = parseList(query.get('tag'));
  const qualities = parseList(query.get('quality'));
  const platforms = parseList(query.get('platform'));
  const minCapacity = Number(query.get('minCapacity'));
  const maxCapacity = Number(query.get('maxCapacity'));
  const dayRange = Number(query.get('dayRange'));

  return worlds.filter((w) => {
    if (search) {
      const haystack = `${w.name} ${w.authorName}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (tags.length && !tags.every((t) => w.tags.includes(t))) return false;
    if (qualities.length && (w.quality === null || !qualities.includes(w.quality))) return false;
    if (platforms.length && !platforms.every((p) => w.platforms.includes(p))) return false;
    if (Number.isFinite(minCapacity) && w.capacity < minCapacity) return false;
    if (Number.isFinite(maxCapacity) && w.capacity > maxCapacity) return false;
    if (Number.isFinite(dayRange) && dayRange > 0) {
      const cutoff = Date.now() - dayRange * 86_400_000;
      if (!w.internalAddDate) return false;
      const added = new Date(w.internalAddDate).getTime();
      if (!Number.isFinite(added) || added < cutoff) return false;
    }
    return true;
  });
}

function paginate(items, limit, offset) {
  return { total: items.length, limit, offset, worlds: items.slice(offset, offset + limit) };
}

async function startNext() {
  console.log('[record] starting next on', APP_PORT);
  const proc = spawn('pnpm', ['exec', 'next', 'dev', '--port', String(APP_PORT)], {
    cwd: REPO,
    env: {
      ...process.env,
      NEXT_PUBLIC_API_BASE_URL: 'http://placeholder.invalid:65535',
      NEXT_PUBLIC_API_BEARER_TOKEN: '',
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_dummy',
      NEXT_PUBLIC_ENABLE_COMMUNITY_SENTIMENT: 'false',
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('next did not start in 30s')), 30_000);
    proc.stdout?.on('data', (chunk) => {
      const s = chunk.toString();
      if (s.includes('ready in')) {
        clearTimeout(timer);
        resolve();
      }
    });
    proc.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`next exited early with code ${code}`));
    });
  });
  return proc;
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const server = await startNext();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    recordVideo: { dir: outDir, size: { width: 1280, height: 900 } },
  });

  const apiRoute = /\/(api)\/(tags|meta|worlds(?:\/[^/]+)?|health)(?:[?#].*)?$/;
  await context.route(apiRoute, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const query = url.searchParams;
    let body;
    let status = 200;
    if (path === '/api/tags') body = tagsResponse;
    else if (path === '/api/meta') body = metaResponse;
    else if (path === '/api/worlds') {
      body = paginate(
        filterWorlds(query),
        Number(query.get('limit') ?? 20),
        Number(query.get('offset') ?? 0),
      );
    } else {
      const m = path.match(/^\/api\/worlds\/([^/]+)$/);
      if (m) {
        const found = worlds.find((w) => w.worldId === m[1]);
        body = found ?? { error: 'not found' };
        if (!found) status = 404;
      } else if (path === '/api/health') {
        body = { status: 'ok', worldCount: worlds.length, dbVersion: 1 };
      } else {
        body = { error: 'unhandled' };
        status = 404;
      }
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  });

  async function open(pathname = '/worlds', seed = {}) {
    const page = await context.newPage();
    await page.addInitScript((seedObj) => {
      const merged = {
        'sos-worlds-scroll-mode': 'pagination',
        'sos-worlds-view-mode': 'grid',
        'sos-theme': 'light',
        ...seedObj,
      };
      for (const [k, v] of Object.entries(merged)) window.localStorage.setItem(k, v);
    }, seed);
    await page.goto(`http://localhost:${APP_PORT}${pathname}`);
    await page.getByRole('heading', { name: /worlds/i }).waitFor();
    await page.waitForTimeout(500);
    return page;
  }

  async function shot(page, name) {
    await page.screenshot({ path: path.join(outDir, name), fullPage: false });
  }

  // Single page reused across scenes so the recording is one continuous clip.
  let page;
  try {
    page = await open();

    // Scene 1: default list
    await page.waitForTimeout(700);
    await shot(page, '01-default.png');

    // Scene 2: tag filter
    await page.getByRole('button', { name: /filters/i }).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /chill\s+\(\d+\)/ }).click();
    await page.waitForTimeout(700);
    await shot(page, '02-tag.png');

    // Scene 3: add quality + platform
    await page.getByRole('button', { name: /good\s*\(\d+\)/i }).click();
    await page.waitForTimeout(500);
    await page.getByTestId('platform-toggle-android').click();
    await page.waitForTimeout(700);
    await shot(page, '03-quality-platform.png');

    // Scene 4: clear all
    await page.getByRole('button', { name: /clear all/i }).click();
    await page.waitForTimeout(700);
    await shot(page, '04-cleared.png');

    // Scene 5: capacity range
    const minInput = page.getByRole('spinbutton', { name: /minimum capacity/i });
    const maxInput = page.getByRole('spinbutton', { name: /maximum capacity/i });
    await minInput.fill('20');
    await minInput.blur();
    await page.waitForTimeout(500);
    await maxInput.fill('30');
    await maxInput.blur();
    await page.waitForTimeout(700);
    await shot(page, '05-capacity.png');

    // Scene 6: day-range preset
    await page.getByTestId('day-range-preset-7').click();
    await page.waitForTimeout(700);
    await shot(page, '06-day-range.png');

    // Scene 7: search debounce
    const search = page.getByPlaceholder(/search/i);
    await search.click();
    for (const ch of 'Dance') {
      await page.keyboard.type(ch, { delay: 80 });
    }
    await page.waitForTimeout(800);
    await shot(page, '07-search.png');

    // Scene 8: combined URL seed — navigate to a fully-filtered URL.
    await page.goto(
      `http://localhost:${APP_PORT}/worlds?tag=chill&quality=good&platform=android&search=Chill&dayRange=30`,
    );
    await page.getByRole('heading', { name: 'Chill Lounge' }).waitFor();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /filters/i }).click();
    await page.waitForTimeout(500);
    await shot(page, '08-combined.png');
  } finally {
    await page.close();
    await context.close();
    await browser.close();
    server.kill('SIGTERM');
  }

  // Find the produced .webm and rename to a stable filename.
  const files = (await fs.readdir(outDir))
    .filter((f) => f.endsWith('.webm'))
    .map((f) => ({ f, p: path.join(outDir, f) }));
  if (files.length === 0) {
    console.log('no video produced');
    return;
  }
  const stats = await Promise.all(
    files.map(async ({ f, p }) => ({ f, p, m: (await fs.stat(p)).mtimeMs })),
  );
  stats.sort((a, b) => b.m - a.m);
  const final = path.join(outDir, 'e2e-worlds-filters.webm');
  await fs.rename(stats[0].p, final);
  console.log('video:', final);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
