import { defineConfig, devices } from '@playwright/test';

// Mobile e2e suite: phones only, minimum supported width is 360px (see AGENTS.md).
export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
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
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
