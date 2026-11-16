import { describe, expect, it } from 'vitest';
import type { BookingData } from '../../../server/models/booking.js';
import { inMemoryBookings } from '../../../server/repositories/bookings.js';
import { inMemoryMeetingTypes } from '../../../server/repositories/meeting-types.js';
import { ms, seedMeetingType } from '../fixtures.js';

// The port contract (ADR 0004): a fresh adapter per test, seeding through
// `create()`, no mocks — writes are observed through `list()`.
describe('in-memory репозиторий типов встреч', () => {
  it('create возвращает сущность с непустым id и сохраняет её', async () => {
    const meetingTypes = inMemoryMeetingTypes();

    const created = await seedMeetingType(meetingTypes);

    expect(created.id).not.toBe('');
    expect(await meetingTypes.list()).toEqual([created]);
  });

  it('create выдаёт разные id двум записям', async () => {
    const meetingTypes = inMemoryMeetingTypes();

    const first = await seedMeetingType(meetingTypes);
    const second = await seedMeetingType(meetingTypes, { name: 'Другой тип' });

    expect(first.id).not.toBe(second.id);
  });

  it('findById находит созданный тип и отдаёт null на промахе', async () => {
    const meetingTypes = inMemoryMeetingTypes();
    const created = await seedMeetingType(meetingTypes);

    expect(await meetingTypes.findById(created.id)).toEqual(created);
    expect(await meetingTypes.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('list отдаёт записи в порядке вставки и копию массива', async () => {
    const meetingTypes = inMemoryMeetingTypes();
    const first = await seedMeetingType(meetingTypes);
    const second = await seedMeetingType(meetingTypes, { name: 'Другой тип' });

    const list = await meetingTypes.list();
    expect(list).toEqual([first, second]);

    list.length = 0;
    expect(await meetingTypes.list()).toEqual([first, second]);
  });
});

const bookingData = (startMs: number): BookingData => ({
  meetingTypeId: 'meeting-type-1',
  meetingTypeName: 'Знакомство',
  guestName: 'Мария Петрова',
  startMs,
  endMs: startMs + 30 * 60_000,
});

describe('in-memory репозиторий броней', () => {
  it('create возвращает сущность с непустым id и сохраняет её', async () => {
    const bookings = inMemoryBookings();

    const created = await bookings.create(bookingData(ms('2026-11-17T09:00:00+03:00')));

    expect(created.id).not.toBe('');
    expect(await bookings.list()).toEqual([created]);
  });

  it('create выдаёт разные id двум записям', async () => {
    const bookings = inMemoryBookings();

    const first = await bookings.create(bookingData(ms('2026-11-17T09:00:00+03:00')));
    const second = await bookings.create(bookingData(ms('2026-11-17T10:00:00+03:00')));

    expect(first.id).not.toBe(second.id);
  });

  it('list отдаёт записи в порядке вставки, а не по времени начала', async () => {
    const bookings = inMemoryBookings();
    // Inserted out of order on purpose: ordering is the scenario's concern.
    const later = await bookings.create(bookingData(ms('2026-11-18T09:00:00+03:00')));
    const earlier = await bookings.create(bookingData(ms('2026-11-17T09:00:00+03:00')));

    expect(await bookings.list()).toEqual([later, earlier]);
  });

  it('list отдаёт копию массива', async () => {
    const bookings = inMemoryBookings();
    const created = await bookings.create(bookingData(ms('2026-11-17T09:00:00+03:00')));

    const list = await bookings.list();
    list.length = 0;

    expect(await bookings.list()).toEqual([created]);
  });
});
