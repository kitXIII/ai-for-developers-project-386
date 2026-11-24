import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import type { Database } from './composition.js';

// The HTTP entry owns the storage policy (ADR 0011). An explicit `DATABASE_URL`
// always wins; without it `--dev` (what `pnpm dev` and e2e pass) falls back to
// the local PGlite profile, and every other entry refuses to start: the
// in-memory adapters are gone, so a missing variable must fail instead of
// serving an empty service.
//
// The deploy entry `server/migrate.ts` reads the same variable before the app
// starts (ADR 0010); `server/repositories/drizzle.config.ts` reads it only for
// the drizzle-kit CLI, never at application runtime.
function resolveDatabase(): Database {
  const url = process.env.DATABASE_URL?.trim();

  if (url) {
    return { kind: 'postgres', url };
  }

  if (process.argv.includes('--dev')) {
    return { kind: 'pglite' };
  }

  console.error(
    'index: DATABASE_URL is not set — refusing to start without a database. ' +
      'Set DATABASE_URL, or run the local PGlite profile with --dev (`pnpm dev`).',
  );
  process.exit(1);
}

const database = resolveDatabase();

let app: FastifyInstance | undefined;

try {
  app = await buildApp({ database });
  await app.listen({
    port: Number(process.env.PORT ?? 3000),
    host: '0.0.0.0',
  });
} catch (error) {
  // The HTTP shell may not exist yet — the startup connection check runs before
  // routes are registered — so this fallback is the one log without a logger.
  if (app) {
    app.log.error(error);
  } else {
    console.error(error);
  }
  process.exit(1);
}
