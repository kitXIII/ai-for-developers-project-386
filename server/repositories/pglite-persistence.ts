import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import type { Persistence } from './persistence.js';
import { postgresBookings, postgresMeetingTypes } from './postgres.js';
import * as schema from './schema.js';

// The local storage of dev, tests and e2e (ADR 0011): the same Postgres,
// compiled to WASM and kept in memory. The composition root imports this module
// lazily, because `@electric-sql/pglite` is a devDependency and the production
// image installs runtime dependencies only (ADR 0011).
//
// `..` points to the project root in development (`server/repositories/`, tsx)
// and in the built output (`dist/repositories/`); the production path never
// loads this module, but the folder stays correct for dev and tests.
const migrationsFolder = resolve(import.meta.dirname, '..', '..', 'migrations');

export async function pglitePersistence(): Promise<Persistence> {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  // The database starts empty and dies with the process, so it owns its schema.
  // The production rule «the app never migrates» (ADR 0010) is about the
  // database that outlives a deploy, not this one.
  await migrate(db, { migrationsFolder });

  let closed: Promise<void> | undefined;

  return {
    meetingTypes: postgresMeetingTypes(db),
    bookings: postgresBookings(db),
    checkConnection: async () => {
      await client.query('SELECT 1');
    },
    close: () => (closed ??= client.close()),
  };
}
