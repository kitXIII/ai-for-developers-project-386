import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from './repositories/schema.js';

// The deploy entry (ADR 0010): `render.yaml` runs this file before
// `dist/index.js`, so a failed migration stops the release instead of serving
// a stale schema. `dist/index.js` itself still never migrates; it only works
// when this file has already done its job.
//
// `..` points to the project root both in development (`server/`, tsx) and in
// the image (`dist/`, with `migrations/` copied next to it by the Dockerfile).
const migrationsFolder = resolve(import.meta.dirname, '..', 'migrations');

// Any stable constant works; every deploy of this service must use the same
// one. The lock is session-scoped and taken on the very connection the
// migrator runs on, so two simultaneous starts (a deploy and a wake-up, for
// example) serialize instead of racing the journal. The free plan offers no
// other deploy-time hook, so the entrypoint is the only place to lock.
const ADVISORY_LOCK_KEY = 710_071;

async function applyMigrations(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString });
  try {
    const client = await pool.connect();
    try {
      // The lock lives on this client, so the migrator below must use it too;
      // a pool-level `drizzle(pool)` could run on another connection and leave
      // the lock guarding nothing.
      await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
      try {
        const db = drizzle(client, { schema });
        // The migrator reads the Drizzle journal from `migrations/` and applies
        // only entries newer than the last one recorded in the database
        // (ADR 0010). A second run on an up-to-date database is a no-op.
        await migrate(db, { migrationsFolder });
      } finally {
        await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
      }
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

try {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    // Production always receives `DATABASE_URL` from the Blueprint (ADR 0009);
    // a blank value here means the deploy is misconfigured and must not fall
    // back to in-memory adapters behind an already-migrated database.
    console.error('migrate: DATABASE_URL is not set — refusing to start without a database.');
    process.exitCode = 1;
  } else {
    await applyMigrations(connectionString);
    console.log(`migrate: journal from ${migrationsFolder} is applied.`);
  }
} catch (error) {
  // Fail closed (ADR 0010): the container command chains `&&`, so a non-zero
  // exit keeps `dist/index.js` from starting against an unmigrated schema.
  console.error('migrate: failed, the app will not start.');
  console.error(error);
  process.exitCode = 1;
}
