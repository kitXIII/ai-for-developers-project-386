import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Every suite that needs storage boots a fresh PGlite (ADR 0011): ~0.6 s per
    // instance on an idle machine, more when `mise run check` runs e2e in
    // parallel. The default 5 s is too tight under that load.
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
