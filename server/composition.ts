import { DEFAULT_SCHEDULE, assertSchedule, type Schedule } from './models/schedule.js';
import type { Persistence } from './repositories/persistence.js';
import { postgresPersistence } from './repositories/postgres-persistence.js';
import {
  createBooking,
  listUpcomingBookings,
  type CreateBookingInput,
} from './services/bookings.js';
import { createMeetingType, getMeetingType, listMeetingTypes } from './services/meeting-types.js';
import { listSlots } from './services/slots.js';

// The storage of one app (ADR 0011). The choice is explicit and has no default:
// `postgres` is the only production storage, `pglite` is the local profile of
// `server/index.ts` (`--dev`). There is no «no database» option any more.
export type Database = { kind: 'postgres'; url: string } | { kind: 'pglite' };

type ComposeOptions = {
  // The clock seam of `buildApp()` stays a string (the contract test is a frozen
  // oracle); the domain lives in epoch-ms, so the conversion happens here
  // (ADR 0004, «Шов часов»).
  now?: () => string;
  // The schedule is configuration: the default lives here, not in the models.
  schedule?: Schedule;
  // Read from the environment by `server/index.ts` only and passed in as an
  // option (ADR 0008): tests and embeddings never inherit a deployment's DB.
  database: Database;
};

async function openPersistence(database: Database): Promise<Persistence> {
  if (database.kind === 'postgres') {
    return postgresPersistence(database.url);
  }

  // `@electric-sql/pglite` is a devDependency and the production image installs
  // runtime dependencies only: the import stays behind this branch, so the prod
  // path never resolves the module (ADR 0011).
  const { pglitePersistence } = await import('./repositories/pglite-persistence.js');
  return pglitePersistence();
}

// The composition root (ADR 0006): the only place that knows the concrete
// adapters. Routes receive these grouped capabilities and never the
// repositories; scenarios still list their own dependencies explicitly.
export async function composeDependencies({
  now = () => new Date().toISOString(),
  schedule = DEFAULT_SCHEDULE,
  database,
}: ComposeOptions) {
  // Configuration errors fail the process here, before any route is registered.
  assertSchedule(schedule);

  const persistence = await openPersistence(database);

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
    // releases the storage; both come from the adapter that owns it.
    checkConnection: persistence.checkConnection,
    close: persistence.close,
  };
}
