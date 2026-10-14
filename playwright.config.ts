import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 5180;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev --port ' + PORT + ' --strictPort',
    url: `http://localhost:${PORT}/worlds`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    cwd: __dirname,
    env: {
      // Override .env.local so tests never hit the real API.
      VITE_API_BASE_URL: 'http://localhost:5181',
      VITE_API_BEARER_TOKEN: '',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_dummy',
      VITE_ENABLE_COMMUNITY_SENTIMENT: 'false',
      // The agent e2e specs drive the assistant route; keep it enabled here.
      VITE_ENABLE_AI_SEARCH: 'true',
    },
  },
});
