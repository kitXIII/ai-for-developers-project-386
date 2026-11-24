import { defineConfig, devices } from '@playwright/test';

// Mobile e2e suite: phones only, minimum supported width is 360px (see AGENTS.md).
const port = Number(process.env.E2E_PORT ?? 3000);
const baseURL = `http://localhost:${port}`;

const env: Record<string, string> = {};
for (const [key, value] of Object.entries(process.env)) {
  if (value !== undefined) env[key] = value;
}

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL,
    // The domain frame is UTC+3 (ADR 0002), while Mantine marks `data-today` by the
    // browser clock and has no timezone option since v8. Pin the browser zone so the
    // suite does not depend on the machine's zone or the hour of the run.
    timezoneId: 'Europe/Moscow',
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 800 } },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // e2e always runs on the local PGlite profile: an exported DATABASE_URL
    // must not point the suite at a real database.
    env: { ...env, PORT: String(port), DATABASE_URL: '' },
  },
});
