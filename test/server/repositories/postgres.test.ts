import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { BookingData } from '../../../server/models/booking.js';
import { DomainError } from '../../../server/models/errors.js';
import type { MeetingType, MeetingTypeData } from '../../../server/models/meeting-type.js';
import { postgresBookings, postgresMeetingTypes } from '../../../server/repositories/postgres.js';
import * as schema from '../../../server/repositories/schema.js';
import { ms } from '../fixtures.js';
import { describeRepositoryContract } from './suite.js';

// One PGlite instance per file: the WASM Postgres boots once, migrations run
// once, and `TRUNCATE ... RESTART IDENTITY CASCADE` isolates the tests — the
// same shape a real Postgres database has (ADR 0008).
const client = new PGlite();
const db = drizzle(client, { schema });
const migrationsFolder = resolve(import.meta.dirname, '../../../migrations');

const adapters = () => ({
  meetingTypes: postgresMeetingTypes(db),
  bookings: postgresBookings(db),
});

async function truncate(): Promise<void> {
  await client.exec('TRUNCATE TABLE bookings, meeting_types RESTART IDENTITY CASCADE');
}

beforeAll(async () => {
  // Run twice on purpose: migrations are idempotent, a second pass is a no-op.
  await migrate(db, { migrationsFolder });
  await migrate(db, { migrationsFolder });
});

afterAll(async () => {
  await client.close();
});

// The root hook runs before every test in this file, including the ones of the
// shared contract suite below.
beforeEach(truncate);

describeRepositoryContract('pg-адаптеры (PGLite)', { create: adapters });

const seedData: MeetingTypeData = {
  name: 'Знакомство',
  description: 'Короткий видеозвонок для знакомства',
  durationMinutes: 30,
};

// Drizzle wraps driver errors; the SQLSTATE lives on the cause chain.
function sqlState(error: unknown): unknown {
  let current: unknown = error;
  while (typeof current === 'object' && current !== null) {
    if ('code' in current) return current.code;
    current = 'cause' in current ? current.cause : undefined;
  }
  return undefined;
}

function bookingData(meetingType: MeetingType, startMs: number): BookingData {
  return {
    meetingTypeId: meetingType.id,
    meetingTypeName: meetingType.name,
    guestName: 'Мария Петрова',
    startMs,
    endMs: startMs + meetingType.durationMinutes * 60_000,
  };
}

// The schema guarantees the «no overlapping bookings» invariant (ADR 0004,
// «Атомарность „проверил → записал“»): the adapter only translates the
// exclusion violation into the domain error.
describe('pg-адаптер броней: exclusion constraint', () => {
  it('одинаковый старт и одинаковая длительность — DomainError slot_taken', async () => {
    const { meetingTypes, bookings } = adapters();
    const meetingType = await meetingTypes.create(seedData);
    const startMs = ms('2026-11-17T09:00:00+03:00');

    await bookings.create(bookingData(meetingType, startMs));

    await expect(bookings.create(bookingData(meetingType, startMs))).rejects.toMatchObject({
      kind: 'slot_taken',
      key: 'errors.domain.slots.taken',
    });
  });

  it('частичное пересечение разных длительностей — DomainError slot_taken', async () => {
    const { meetingTypes, bookings } = adapters();
    const shorter = await meetingTypes.create(seedData);
    const longer = await meetingTypes.create({
      ...seedData,
      name: 'Консультация',
      durationMinutes: 60,
    });
    const startMs = ms('2026-11-17T09:00:00+03:00');

    await bookings.create(bookingData(shorter, startMs));

    // 09:15–10:15 overlaps 09:00–09:30.
    await expect(bookings.create(bookingData(longer, startMs + 15 * 60_000))).rejects.toMatchObject(
      {
        kind: 'slot_taken',
        key: 'errors.domain.slots.taken',
      },
    );
  });

  it('одинаковый старт разных длительностей — DomainError slot_taken', async () => {
    const { meetingTypes, bookings } = adapters();
    const shorter = await meetingTypes.create(seedData);
    const longer = await meetingTypes.create({
      ...seedData,
      name: 'Консультация',
      durationMinutes: 60,
    });
    const startMs = ms('2026-11-17T09:00:00+03:00');

    await bookings.create(bookingData(shorter, startMs));

    await expect(bookings.create(bookingData(longer, startMs))).rejects.toMatchObject({
      kind: 'slot_taken',
    });
  });

  it('стык интервалов разрешён: конец одной брони — начало следующей', async () => {
    const { meetingTypes, bookings } = adapters();
    const meetingType = await meetingTypes.create(seedData);
    const startMs = ms('2026-11-17T09:00:00+03:00');

    const first = await bookings.create(bookingData(meetingType, startMs));
    const second = await bookings.create(bookingData(meetingType, startMs + 30 * 60_000));

    expect(await bookings.list()).toEqual([first, second]);
  });

  it('остальные ошибки не маскируются: нарушение FK — не DomainError', async () => {
    const { bookings } = adapters();
    const unknownMeetingTypeId = '00000000-0000-0000-0000-000000000000';

    const error = await bookings
      .create({
        meetingTypeId: unknownMeetingTypeId,
        meetingTypeName: 'Неизвестный тип',
        guestName: 'Мария Петрова',
        startMs: ms('2026-11-17T09:00:00+03:00'),
        endMs: ms('2026-11-17T09:30:00+03:00'),
      })
      .catch((caught: unknown) => caught);

    expect(error).not.toBeInstanceOf(DomainError);
    expect(sqlState(error)).toBe('23503');
  });
});
