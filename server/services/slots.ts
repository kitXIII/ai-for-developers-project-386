import type { Schedule } from '../models/schedule.js';
import { busyIntervals, generateSlots, type SlotsDay } from '../models/slots.js';
import type { BookingRepository } from '../repositories/bookings.js';
import type { MeetingTypeRepository } from '../repositories/meeting-types.js';
import { getMeetingType } from './meeting-types.js';

// The slot calendar scenario (ADR 0004): the unknown type wins over the slot
// rules, the busy set is every booking of every type, and the clock is read
// once per scenario. Nothing here knows about HTTP or moment formatting.
type SlotsDeps = {
  meetingTypes: MeetingTypeRepository;
  bookings: BookingRepository;
  schedule: Schedule;
  now: () => number;
};

export async function listSlots(
  { meetingTypes, bookings, schedule, now }: SlotsDeps,
  meetingTypeId: string,
): Promise<SlotsDay[]> {
  const meetingType = await getMeetingType({ meetingTypes }, meetingTypeId);
  const busy = busyIntervals(await bookings.list());

  return generateSlots({
    nowMs: now(),
    durationMinutes: meetingType.durationMinutes,
    busy,
    schedule,
  });
}
