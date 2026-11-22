import type { BookingData } from '../../server/models/booking.js';
import type { MeetingType, MeetingTypeData } from '../../server/models/meeting-type.js';
import type { Schedule } from '../../server/models/schedule.js';
import type { MeetingTypeRepository } from '../../server/repositories/meeting-types.js';

// The clock of the model/scenario tests: Monday 16.11.2026 12:00 UTC+3. The
// booking window is 17–30 November; weekends inside it are 21–22 and 28–29.
export const FROZEN_NOW_MS = Date.parse('2026-11-16T12:00:00+03:00');

// A literal, not `DEFAULT_SCHEDULE`: importing the production default would
// make the test check itself (ADR 0004).
export const TEST_SCHEDULE: Schedule = {
  utcOffsetMinutes: 180,
  workdayStartMinute: 9 * 60,
  workdayEndMinute: 18 * 60,
  windowDays: 14,
};

// Contract moment → epoch-ms, the domain unit.
export function ms(moment: string): number {
  return Date.parse(moment);
}

// UTC+3 calendar date (YYYY-MM-DD) of the frozen moment shifted by N days.
export function localDate(dayOffset: number): string {
  const dayMs = 24 * 60 * 60 * 1000;
  const shifted = FROZEN_NOW_MS + dayOffset * dayMs + TEST_SCHEDULE.utcOffsetMinutes * 60_000;
  return new Date(shifted).toISOString().slice(0, 10);
}

// The shared seed of the scenario/repository tests (ADR 0004): the production
// in-memory adapter is used as-is, seeded through its own port.
export const SEED_MEETING_TYPE: MeetingTypeData = {
  name: 'Знакомство',
  description: 'Короткий видеозвонок для знакомства',
  durationMinutes: 30,
};

export async function seedMeetingType(
  meetingTypes: MeetingTypeRepository,
  data: Partial<MeetingTypeData> = {},
) {
  return meetingTypes.create({ ...SEED_MEETING_TYPE, ...data });
}

// Booking data of the repository contract: the duration comes from the type,
// exactly as `draftBooking` derives it.
export function bookingData(meetingType: MeetingType, startMs: number): BookingData {
  return {
    meetingTypeId: meetingType.id,
    meetingTypeName: meetingType.name,
    guestName: 'Мария Петрова',
    startMs,
    endMs: startMs + meetingType.durationMinutes * 60_000,
  };
}
