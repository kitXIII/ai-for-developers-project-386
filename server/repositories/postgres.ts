import { asc, eq } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import type { Booking, BookingData } from '../models/booking.js';
import { DomainError } from '../models/errors.js';
import type { MeetingType, MeetingTypeData } from '../models/meeting-type.js';
import type { BookingRepository } from './bookings.js';
import type { MeetingTypeRepository } from './meeting-types.js';
import * as schema from './schema.js';

// Postgres adapters for both ports (ADR 0008). One implementation serves
// `drizzle-orm/node-postgres` in production and `drizzle-orm/pglite` in tests:
// the generic is the driver's query-result type, so no adapter logic is
// duplicated per driver and the query builder stays fully typed.
type PostgresDatabase<TQueryResult extends PgQueryResultHKT> = PgDatabase<
  TQueryResult,
  typeof schema
>;

// The columns of the entity, without the storage-only `seq`: the same selection
// feeds `select`, `insert ... returning` and the domain type, so the mapper
// cannot drift from the port.
const meetingTypeColumns = {
  id: schema.meetingTypes.id,
  name: schema.meetingTypes.name,
  description: schema.meetingTypes.description,
  durationMinutes: schema.meetingTypes.durationMinutes,
};

const bookingColumns = {
  id: schema.bookings.id,
  meetingTypeId: schema.bookings.meetingTypeId,
  meetingTypeName: schema.bookings.meetingTypeName,
  guestName: schema.bookings.guestName,
  startMs: schema.bookings.startMs,
  endMs: schema.bookings.endMs,
};

// PostgreSQL class 23 (integrity constraint violation), code 23P01 is
// `exclusion_violation`: the slot overlaps a booking already in the table.
// Drizzle wraps driver errors, so the SQLSTATE lives somewhere on the cause
// chain rather than on the thrown value itself.
function isSlotConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if ('code' in error && error.code === '23P01') return true;
  return 'cause' in error && isSlotConflict(error.cause);
}

export function postgresMeetingTypes<TQueryResult extends PgQueryResultHKT>(
  db: PostgresDatabase<TQueryResult>,
): MeetingTypeRepository {
  return {
    create: async (data: MeetingTypeData): Promise<MeetingType> => {
      const [row] = await db.insert(schema.meetingTypes).values(data).returning(meetingTypeColumns);
      return row;
    },
    findById: async (id: string): Promise<MeetingType | null> => {
      const [row] = await db
        .select(meetingTypeColumns)
        .from(schema.meetingTypes)
        .where(eq(schema.meetingTypes.id, id));
      return row ?? null;
    },
    // A copy, ordered by the identity column: insertion order is part of the
    // port contract, and a table scan has no order of its own.
    list: async (): Promise<MeetingType[]> =>
      db.select(meetingTypeColumns).from(schema.meetingTypes).orderBy(asc(schema.meetingTypes.seq)),
  };
}

export function postgresBookings<TQueryResult extends PgQueryResultHKT>(
  db: PostgresDatabase<TQueryResult>,
): BookingRepository {
  return {
    create: async (data: BookingData): Promise<Booking> => {
      try {
        const [row] = await db.insert(schema.bookings).values(data).returning(bookingColumns);
        return row;
      } catch (error) {
        // «No overlapping bookings» is guaranteed by the exclusion constraint
        // (custom-SQL migration): the scenario checked the rules, the schema
        // closes the race window, and the adapter translates only that one
        // error. Everything else is rethrown untouched.
        if (isSlotConflict(error)) {
          throw new DomainError('slot_taken', 'errors.domain.slots.taken');
        }
        throw error;
      }
    },
    list: async (): Promise<Booking[]> =>
      db.select(bookingColumns).from(schema.bookings).orderBy(asc(schema.bookings.seq)),
  };
}
