import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Persistence } from '../../../server/repositories/persistence.js';
import { createBooking } from '../../../server/services/bookings.js';
import { listSlots } from '../../../server/services/slots.js';
import {
  createTestPersistence,
  FROZEN_NOW_MS,
  localDate,
  ms,
  seedMeetingType,
  TEST_SCHEDULE,
} from '../fixtures.js';

// The slot scenario without Fastify (ADR 0004): a fresh PGlite storage
// (ADR 0011) is seeded through the ports, no mocks and no call counts.
let persistence: Persistence;

beforeEach(async () => {
  persistence = await createTestPersistence();
});

afterEach(async () => {
  await persistence.close();
});

function setup() {
  return {
    meetingTypes: persistence.meetingTypes,
    bookings: persistence.bookings,
    schedule: TEST_SCHEDULE,
    now: () => FROZEN_NOW_MS,
  };
}

function startOf(dayOffset: number, time: string): number {
  return ms(`${localDate(dayOffset)}T${time}+03:00`);
}

describe('listSlots', () => {
  it('бросает not_found на неизвестный тип встречи', async () => {
    const deps = setup();

    await expect(listSlots(deps, '00000000-0000-0000-0000-000000000000')).rejects.toMatchObject({
      kind: 'not_found',
    });
  });

  it('собирает busy из всех броней: чужая бронь сдвигает первый слот дня', async () => {
    const deps = setup();
    const shorter = await seedMeetingType(deps.meetingTypes);
    const longer = await seedMeetingType(deps.meetingTypes, {
      name: 'Глубокое интервью',
      durationMinutes: 75,
    });

    // 09:00–10:15 of the longer type partially covers the 10:00 start of the
    // 30-minute grid, so the first free slot of the day is 10:30.
    await createBooking(deps, {
      meetingTypeId: longer.id,
      startMs: startOf(1, '09:00:00'),
      guestName: 'Анна Смирнова',
    });

    const days = await listSlots(deps, shorter.id);

    expect(days[0]?.slots[0]?.startMs).toBe(startOf(1, '10:30:00'));
  });
});
