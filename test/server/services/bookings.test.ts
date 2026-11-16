import { describe, expect, it } from 'vitest';
import { createBooking, listUpcomingBookings } from '../../../server/services/bookings.js';
import { inMemoryBookings } from '../../../server/repositories/bookings.js';
import { inMemoryMeetingTypes } from '../../../server/repositories/meeting-types.js';
import { FROZEN_NOW_MS, localDate, ms, seedMeetingType, TEST_SCHEDULE } from '../fixtures.js';

// Scenarios are exercised without Fastify (ADR 0004): the production in-memory
// adapters are seeded through their own ports, writes are observed via `list()`
// — no mocks and no call counts.
function setup() {
  return {
    meetingTypes: inMemoryMeetingTypes(),
    bookings: inMemoryBookings(),
    schedule: TEST_SCHEDULE,
    now: () => FROZEN_NOW_MS,
  };
}

function startOf(dayOffset: number, time: string): number {
  return ms(`${localDate(dayOffset)}T${time}+03:00`);
}

describe('createBooking', () => {
  it('создаёт бронь с endMs по длительности типа и денормализованным именем', async () => {
    const deps = setup();
    const meetingType = await seedMeetingType(deps.meetingTypes);
    const startMs = startOf(1, '09:00:00');

    const booking = await createBooking(deps, {
      meetingTypeId: meetingType.id,
      startMs,
      guestName: 'Мария Петрова',
    });

    expect(booking).toMatchObject({
      meetingTypeId: meetingType.id,
      meetingTypeName: meetingType.name,
      guestName: 'Мария Петрова',
      startMs,
      endMs: startMs + meetingType.durationMinutes * 60_000,
    });
    expect(booking.id).not.toBe('');
    expect(await deps.bookings.list()).toEqual([booking]);
  });

  it('бросает not_found на неизвестный тип раньше правил слота', async () => {
    const deps = setup();

    await expect(
      createBooking(deps, {
        meetingTypeId: '00000000-0000-0000-0000-000000000000',
        // Today is outside the booking window: the unknown type must win.
        startMs: startOf(0, '10:00:00'),
        guestName: 'Мария Петрова',
      }),
    ).rejects.toMatchObject({ kind: 'not_found' });
    expect(await deps.bookings.list()).toEqual([]);
  });

  it('после ошибки правила слота ничего не записывает', async () => {
    const deps = setup();
    const meetingType = await seedMeetingType(deps.meetingTypes);
    const existing = await deps.bookings.create({
      meetingTypeId: meetingType.id,
      meetingTypeName: meetingType.name,
      guestName: 'Анна Смирнова',
      startMs: startOf(1, '09:00:00'),
      endMs: startOf(1, '09:30:00'),
    });

    await expect(
      createBooking(deps, {
        meetingTypeId: meetingType.id,
        startMs: startOf(1, '09:00:00'),
        guestName: 'Мария Петрова',
      }),
    ).rejects.toMatchObject({ kind: 'slot_taken' });
    expect(await deps.bookings.list()).toEqual([existing]);
  });

  it('проверяет пересечение со всеми бронями, а не только своего типа', async () => {
    const deps = setup();
    const shorter = await seedMeetingType(deps.meetingTypes);
    const longer = await seedMeetingType(deps.meetingTypes, {
      name: 'Глубокое интервью',
      durationMinutes: 100,
    });

    // 09:00–10:40 of the longer type partially covers the 30-minute 10:00 start.
    await createBooking(deps, {
      meetingTypeId: longer.id,
      startMs: startOf(1, '09:00:00'),
      guestName: 'Анна Смирнова',
    });

    await expect(
      createBooking(deps, {
        meetingTypeId: shorter.id,
        startMs: startOf(1, '10:00:00'),
        guestName: 'Мария Петрова',
      }),
    ).rejects.toMatchObject({ kind: 'slot_taken' });
  });
});

describe('listUpcomingBookings', () => {
  const bookingOf = (startMs: number, endMs: number, guestName: string) => ({
    meetingTypeId: 'meeting-type-1',
    meetingTypeName: 'Знакомство',
    guestName,
    startMs,
    endMs,
  });

  it('оставляет брони, которые ещё не закончились', async () => {
    const bookings = inMemoryBookings();
    const upcoming = await bookings.create(
      bookingOf(FROZEN_NOW_MS + 60_000, FROZEN_NOW_MS + 30 * 60_000, 'Мария Петрова'),
    );
    const inProgress = await bookings.create(
      bookingOf(FROZEN_NOW_MS - 10 * 60_000, FROZEN_NOW_MS + 10 * 60_000, 'Анна Смирнова'),
    );
    await bookings.create(
      bookingOf(FROZEN_NOW_MS - 60 * 60_000, FROZEN_NOW_MS - 30 * 60_000, 'Пётр Сидоров'),
    );

    const list = await listUpcomingBookings({ bookings, now: () => FROZEN_NOW_MS });

    expect(list).toEqual([inProgress, upcoming]);
  });

  it('сортирует по началу, не полагаясь на порядок вставки', async () => {
    const bookings = inMemoryBookings();
    const later = await bookings.create(
      bookingOf(FROZEN_NOW_MS + 2 * 60 * 60_000, FROZEN_NOW_MS + 150 * 60_000, 'Позже'),
    );
    const earlier = await bookings.create(
      bookingOf(FROZEN_NOW_MS + 60 * 60_000, FROZEN_NOW_MS + 1.5 * 60 * 60_000, 'Раньше'),
    );

    const list = await listUpcomingBookings({ bookings, now: () => FROZEN_NOW_MS });

    expect(list).toEqual([earlier, later]);
  });

  it('отдаёт пустой список, когда броней нет', async () => {
    const bookings = inMemoryBookings();

    expect(await listUpcomingBookings({ bookings, now: () => FROZEN_NOW_MS })).toEqual([]);
  });
});
