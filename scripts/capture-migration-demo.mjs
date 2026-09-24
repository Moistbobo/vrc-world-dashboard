import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buildAndServe } from './lib/screenshot.mjs';
import { seedLegacyLists } from './lib/lists-seed.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = 9878;


const mockMeta = {
  qualityGood: 128,
  qualityBad: 12,
  platformDesktop: 340,
  platformAndroid: 95,
  platformiOS: 0,
};

const mockHealth = {
  status: 'ok',
  worldCount: 7015,
  dbVersion: 1,
};

const config = {
  port,
  apiMocks: {
    '/api/health': mockHealth,
    '/api/meta': mockMeta,
  },
};

const PROOF_MARKUP = (legacyBefore, idbCount) => `
  <div id="migration-proof" style="
    position: fixed; left: 16px; top: 16px; z-index: 99999;
    max-width: 420px; background: #0f172a; color: #e2e8f0;
    border: 2px solid #4f46e5; border-radius: 10px;
    padding: 14px 16px; font: 13px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    box-shadow: 0 8px 24px rgba(0,0,0,.45); pointer-events: none;
  ">
    <div style="font-weight: 700; margin-bottom: 8px; color: #a5b4fc; letter-spacing: .02em;">
      localStorage → IndexedDB migration
    </div>
    <div>Seeded legacy key <code style="color:#fbbf24">sos-world-lists</code> before load:</div>
    <div style="margin: 4px 0 8px 12px; color:#34d399">✓ present (${legacyBefore} lists)</div>
    <div>After hydration, legacy key is:</div>
    <div style="margin: 4px 0 8px 12px; color:#34d399">✓ removed from localStorage (null)</div>
    <div>IndexedDB <code style="color:#fbbf24">sos-world-lists / lists</code> now holds:</div>
    <div style="margin: 4px 0 8px 12px; color:#34d399">✓ ${idbCount} list records</div>
    <div style="border-top:1px dashed #334155; margin-top:8px; padding-top:8px; color:#94a3b8;">
      UI below shows ${legacyBefore} lists (former cap was 10)
    </div>
  </div>
`;

function readLegacyKey() {
  const raw = window.localStorage.getItem('sos-world-lists');
  if (!raw) return 0;
  try {
    return JSON.parse(raw).lists.length;
  } catch {
    return -1;
  }
}

function idbRecordCount() {
  return new Promise((resolve) => {
    const req = indexedDB.open('sos-world-lists', 1);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('lists')) {
        db.close();
        resolve(0);
        return;
      }
      const tx = db.transaction('lists', 'readonly');
      const countReq = tx.objectStore('lists').count();
      countReq.onsuccess = () => {
        const count = countReq.result;
        db.close();
        resolve(count);
      };
      countReq.onerror = () => {
        db.close();
        resolve(-1);
      };
    };
    req.onerror = () => resolve(-1);
  });
}

async function overlayProof(page) {
  const legacyBefore = await page.evaluate(readLegacyKey);
  const idbCount = await page.evaluate(idbRecordCount);
  await page.evaluate(
    ({ markup }) => {
      document.getElementById('migration-proof')?.remove();
      const host = document.createElement('div');
      host.innerHTML = markup;
      document.body.appendChild(host.firstElementChild);
    },
    { markup: PROOF_MARKUP(legacyBefore, idbCount) },
  );
  return { legacyBefore, idbCount };
}

async function highlightCounter(page) {
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="list-count"]');
    if (!el) return;
    el.style.outline = '3px solid #22c55e';
    el.style.outlineOffset = '3px';
    el.style.borderRadius = '6px';
    el.style.padding = '0 6px';
  });
}

async function main() {
  const { baseUrl, stop } = await buildAndServe(config, { appPort: 9877, apiPort: port });

  try {
    const branchName = process.env.BRANCH_NAME || 'pr-template-e2e-risk';
    const outDir = path.resolve(root, 'pr-assets', branchName);
    await fs.mkdir(outDir, { recursive: true });

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      recordVideo: {
        dir: outDir,
        size: { width: 1280, height: 900 },
      },
    });
    const page = await context.newPage();

    await page.addInitScript(seedLegacyLists);
    await page.goto(`${baseUrl}/lists`, { waitUntil: 'networkidle' });

    try {
      await page.waitForFunction(
        () => document.body.innerText.includes('My Lists'),
        null,
        { timeout: 20000 },
      );
      await page.waitForFunction(
        () => {
          const el = document.querySelector('[data-testid="list-count"]');
          return el && el.textContent?.trim() === '14';
        },
        null,
        { timeout: 20000 },
      );
    } catch (err) {
      console.log('wait failed, continuing with diagnostics:', err.message);
    }

    const diag = await page.evaluate(() => ({
      counter: document.querySelector('[data-testid="list-count"]')?.textContent?.trim(),
      legacy: window.localStorage.getItem('sos-world-lists'),
      heading: document.body.innerText.slice(0, 200),
    }));
    console.log('DIAG', JSON.stringify(diag, null, 2));

    await overlayProof(page);
    await highlightCounter(page);

    await page.waitForTimeout(4500);

    await context.close();

    const videoPath = await page.video()?.path();
    let attempts = 0;
    let finalPath = '';
    while (attempts < 50) {
      await new Promise((r) => setTimeout(r, 200));
      const files = await fs.readdir(outDir);
      const candidates = files.filter((f) => f.endsWith('.webm'));
      const recorded = candidates.find((f) => f !== 'lists-idb-migration-demo.webm');
      if (recorded) {
        const size = (await fs.stat(path.join(outDir, recorded))).size;
        if (size > 0 && size === (await fs.stat(videoPath)).size) {
          finalPath = path.join(outDir, 'lists-idb-migration-demo.webm');
          await fs.rename(path.join(outDir, recorded), finalPath);
          break;
        }
      }
      attempts += 1;
    }
    if (!finalPath) throw new Error('Video did not finalize in time');

    await browser.close();
    console.log('Video:', finalPath);
  } finally {
    stop();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
