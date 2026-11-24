import { type ChildProcess, spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { expect, test, type TestInfo } from '@playwright/test';

// Empty states need a pristine server: the dev server from playwright.config
// keeps types and bookings in memory, and the other spec files populate them
// through the UI. So each check here boots its own fresh instance of the same
// dev app (`pnpm dev` without watch) and drives it through the UI only — no
// API fixtures (docs/test-plan.md).
const ROOT = resolve(import.meta.dirname, '../..');

// Ports per check, +1 for the desktop project: the two projects run in
// parallel, and a port may listen for one server at a time.
function portFor(testInfo: TestInfo, base: number): number {
  return testInfo.project.name === 'desktop' ? base + 1 : base;
}

function startServer(port: number): ChildProcess {
  return spawn(resolve(ROOT, 'node_modules/.bin/tsx'), ['server/index.ts', '--dev'], {
    cwd: ROOT,
    // The local profile must land on PGlite even when the developer has a real
    // DATABASE_URL exported: a pristine server is the whole point of this spec.
    env: { ...process.env, DATABASE_URL: '', PORT: String(port) },
    // A new process group, so the stop below kills tsx and its node child.
    detached: true,
    stdio: 'ignore',
  });
}

async function waitForServer(url: string): Promise<void> {
  const deadline = Date.now() + 60_000;
  for (;;) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Not listening yet.
    }
    if (Date.now() > deadline) {
      throw new Error(`Свежий dev-сервер не поднялся за 60 секунд: ${url}`);
    }
    await new Promise((wake) => setTimeout(wake, 250));
  }
}

async function stopServer(server: ChildProcess): Promise<void> {
  if (server.pid === undefined) {
    return;
  }
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    // Already exited.
    return;
  }
  const exited = new Promise<void>((done) => server.once('exit', () => done()));
  const timeout = new Promise<void>((done) => setTimeout(done, 3_000));
  await Promise.race([exited, timeout]);
  try {
    process.kill(-server.pid, 'SIGKILL');
  } catch {
    // Already gone.
  }
}

// Boots a fresh server on the check's port and runs the body against it,
// stopping the server afterwards.
async function withFreshServer(
  testInfo: TestInfo,
  basePort: number,
  run: (url: string) => Promise<void>,
): Promise<void> {
  const port = portFor(testInfo, basePort);
  const server = startServer(port);
  const url = `http://localhost:${port}`;
  try {
    await waitForServer(url);
    await run(url);
  } finally {
    await stopServer(server);
  }
}

// AC тикета #12: пустое состояние списка типов у гостя.
test('гость видит пустое состояние, когда типов встреч ещё нет', async ({ page }, testInfo) => {
  await withFreshServer(testInfo, 3011, async (url) => {
    await page.goto(`${url}/booking`);

    await expect(page.getByRole('heading', { name: 'Выбор типа встречи' })).toBeVisible();
    await expect(page.getByText('Типов встреч пока нет — загляните позже.')).toBeVisible();
  });
});

// AC тикета #15: пустое состояние вкладки «Бронирования», когда броней нет.
test('владелец видит пустое состояние вкладки «Бронирования», когда броней нет', async ({
  page,
}, testInfo) => {
  await withFreshServer(testInfo, 3013, async (url) => {
    await page.goto(`${url}/admin`);

    await page.getByRole('tab', { name: 'Бронирования' }).click();

    await expect(
      page.getByText('Бронирований пока нет — как только гость запишется, бронь появится здесь.'),
    ).toBeVisible();
  });
});
