import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Persistence } from './persistence.js';
import { postgresBookings, postgresMeetingTypes } from './postgres.js';
import * as schema from './schema.js';

// The production storage (ADR 0008, 0011): both ports go through one pool and
// one Drizzle instance, so a request never holds two connections to the same
// database for one logical operation.
export function postgresPersistence(connectionString: string): Persistence {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  let closed: Promise<void> | undefined;

  return {
    meetingTypes: postgresMeetingTypes(db),
    bookings: postgresBookings(db),
    // `buildApp()` calls it before registering routes, so an unreachable
    // database fails startup instead of the first request.
    checkConnection: async () => {
      await pool.query('SELECT 1');
    },
    // One pool per app; the second call returns the same promise, so
    // `app.close()` and a failed startup can both ask without racing.
    close: () => (closed ??= pool.end()),
  };
}
