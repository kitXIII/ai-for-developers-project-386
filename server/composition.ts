import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DEFAULT_SCHEDULE, assertSchedule, type Schedule } from './models/schedule.js';
import { inMemoryBookings } from './repositories/bookings.js';
import type { BookingRepository } from './repositories/bookings.js';
import { inMemoryMeetingTypes } from './repositories/meeting-types.js';
import type { MeetingTypeRepository } from './repositories/meeting-types.js';
import { postgresBookings, postgresMeetingTypes } from './repositories/postgres.js';
import * as schema from './repositories/schema.js';
import {
  createBooking,
  listUpcomingBookings,
  type CreateBookingInput,
} from './services/bookings.js';
import { createMeetingType, getMeetingType, listMeetingTypes } from './services/meeting-types.js';
import { listSlots } from './services/slots.js';

type ComposeOptions = {
  // The clock seam of `buildApp()` stays a string (the contract test is a frozen
  // oracle); the domain lives in epoch-ms, so the conversion happens here
  // (ADR 0004, «Шов часов»).
  now?: () => string;
  // The schedule is configuration: the default lives here, not in the models.
  schedule?: Schedule;
  // Read from the environment by `server/index.ts` only and passed in as an
  // option (ADR 0008): tests and embeddings never inherit a deployment's DB.
  // An empty string is the same as no value.
  databaseUrl?: string;
};

type Persistence = {
  meetingTypes: MeetingTypeRepository;
  bookings: BookingRepository;
  checkConnection: () => Promise<void>;
  close: () => Promise<void>;
};

// Without `DATABASE_URL` nothing changes for the API: the in-memory adapters
// keep state in the process, the connection check is a no-op and `close` is
// idempotent (there is nothing to close).
function inMemoryPersistence(): Persistence {
  return {
    meetingTypes: inMemoryMeetingTypes(),
    bookings: inMemoryBookings(),
    checkConnection: async () => {},
    close: async () => {},
  };
}

// With `DATABASE_URL` both ports go through one pool and one Drizzle instance:
// the adapters are the same implementation tests run on PGlite (ADR 0008).
function postgresPersistence(connectionString: string): Persistence {
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

// The composition root (ADR 0006): the only place that knows the concrete
// adapters. Routes receive these grouped capabilities and never the
// repositories; scenarios still list their own dependencies explicitly.
export function composeDependencies({
  now = () => new Date().toISOString(),
  schedule = DEFAULT_SCHEDULE,
  databaseUrl,
}: ComposeOptions = {}) {
  // Configuration errors fail the process here, before any route is registered.
  assertSchedule(schedule);

  const persistence =
    databaseUrl && databaseUrl.trim() !== ''
      ? postgresPersistence(databaseUrl)
      : inMemoryPersistence();

  // One adapters bundle is assembled here and passed structurally: scenarios
  // still declare exactly the dependencies they read (ADR 0004).
  const domain = {
    meetingTypes: persistence.meetingTypes,
    bookings: persistence.bookings,
    schedule,
    now: () => Date.parse(now()),
  };

  return {
    schedule,
    meetingTypes: {
      list: () => listMeetingTypes({ meetingTypes: domain.meetingTypes }),
      get: (id: string) => getMeetingType({ meetingTypes: domain.meetingTypes }, id),
      create: (fields: Record<string, unknown>) =>
        createMeetingType({ meetingTypes: domain.meetingTypes }, fields),
      listSlots: (id: string) => listSlots(domain, id),
    },
    bookings: {
      create: (input: CreateBookingInput) => createBooking(domain, input),
      listUpcoming: () => listUpcomingBookings({ bookings: domain.bookings, now: domain.now }),
    },
    // Startup checks the connection before the app is returned, and `onClose`
    // releases the pool; both are no-ops for the in-memory adapters.
    checkConnection: persistence.checkConnection,
    close: persistence.close,
  };
}
