import { draftBooking, type Booking } from '../models/booking.js';
import type { Schedule } from '../models/schedule.js';
import { assertSlotBookable, busyIntervals } from '../models/slots.js';
import type { BookingRepository } from '../repositories/bookings.js';
import type { MeetingTypeRepository } from '../repositories/meeting-types.js';
import { getMeetingType } from './meeting-types.js';

// Booking scenarios (ADR 0004): dependencies arrive as an explicit object, the
// scenario owns the domain rules and never sees Fastify, statuses or moment
// formatting. The clock and the schedule come from `buildApp()`.
type BookingDeps = {
  meetingTypes: MeetingTypeRepository;
  bookings: BookingRepository;
  schedule: Schedule;
  now: () => number;
};

export type CreateBookingInput = {
  meetingTypeId: string;
  // Parsed from the contract moment by the adapter, which also checks the
  // envelope and the field types.
  startMs: number;
  guestName: string;
};

// The unknown type wins over every slot rule: the adapter keeps 400 before 404,
// the scenario keeps 404 before the rules. Checking and writing are two awaited
// calls now: uniqueness on a real database is the schema's job (ADR 0004,
// «Атомарность „проверил → записал“»).
export async function createBooking(
  { meetingTypes, bookings, schedule, now }: BookingDeps,
  { meetingTypeId, startMs, guestName }: CreateBookingInput,
): Promise<Booking> {
  const meetingType = await getMeetingType({ meetingTypes }, meetingTypeId);
  const draft = draftBooking({ meetingType, guestName, startMs });

  assertSlotBookable({
    nowMs: now(),
    durationMinutes: meetingType.durationMinutes,
    startMs: draft.startMs,
    busy: busyIntervals(await bookings.list()),
    schedule,
  });

  return bookings.create(draft);
}

// A booking stays on the owner's list until it is over: an end in the future
// keeps the booking in progress visible too. The nearest booking comes first
// (user story 9) whatever the insertion order was.
export async function listUpcomingBookings({
  bookings,
  now,
}: Pick<BookingDeps, 'bookings' | 'now'>): Promise<Booking[]> {
  const nowMs = now();
  return (await bookings.list())
    .filter((booking) => booking.endMs > nowMs)
    .sort((a, b) => a.startMs - b.startMs);
}
