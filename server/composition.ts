import { DEFAULT_SCHEDULE, assertSchedule, type Schedule } from './models/schedule.js';
import { inMemoryBookings } from './repositories/bookings.js';
import { inMemoryMeetingTypes } from './repositories/meeting-types.js';
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
};

// The composition root (ADR 0006): the only place that knows the concrete
// adapters. Routes receive these grouped capabilities and never the
// repositories; scenarios still list their own dependencies explicitly.
export function composeDependencies({
  now = () => new Date().toISOString(),
  schedule = DEFAULT_SCHEDULE,
}: ComposeOptions = {}) {
  // Configuration errors fail the process here, before any route is registered.
  assertSchedule(schedule);

  // One adapters bundle is assembled here and passed structurally: scenarios
  // still declare exactly the dependencies they read (ADR 0004).
  const domain = {
    meetingTypes: inMemoryMeetingTypes(),
    bookings: inMemoryBookings(),
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
  };
}
