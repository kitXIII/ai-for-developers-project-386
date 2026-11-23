import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface CliResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

// The production seam of the deploy runner is the image (`node dist/migrate.js`
// against a real Postgres), so the only part testable without a database is the
// CLI contract itself: a missing `DATABASE_URL` must fail closed with a clear
// message (ADR 0010). Spawning the real entry keeps `pg` unmocked.
function runMigrate(): Promise<CliResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'server/migrate.ts'], {
      cwd: resolve(import.meta.dirname, '..', '..'),
      env: { ...process.env, DATABASE_URL: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => resolvePromise({ code, stdout, stderr }));
  });
}

describe('server/migrate.ts без DATABASE_URL', () => {
  it('завершается с ненулевым кодом и понятной ошибкой', async () => {
    const result = await runMigrate();

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('DATABASE_URL is not set');
    expect(result.stdout).toBe('');
  }, 20_000);
});
