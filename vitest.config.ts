import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['node_modules', '.next/**', '.worktrees/**', '.opencode/**', 'e2e/**'],
  },
});
