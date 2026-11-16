// The schedule value object (ADR 0004): whole minutes only, because the domain
// lives in epoch-ms and must not parse `'09:00'` or `'+03:00'` strings.
// `buildApp()` owns the default and validates it on start; the model reads
// neither the clock nor the configuration.
export type Schedule = {
  // UTC+3 is fixed all year, so a plain offset is enough: no IANA zone, no DST.
  utcOffsetMinutes: number;
  workdayStartMinute: number;
  workdayEndMinute: number;
  windowDays: number;
};

export const DEFAULT_SCHEDULE: Schedule = {
  utcOffsetMinutes: 180,
  workdayStartMinute: 9 * 60,
  workdayEndMinute: 18 * 60,
  windowDays: 14,
};

// The domain lives in epoch-ms: the same constants and one shift serve every
// module that counts in the schedule's offset frame (models and adapters).
export const MINUTE_MS = 60_000;
export const DAY_MS = 24 * 60 * MINUTE_MS;

// An instant moved into the schedule's fixed UTC-offset frame.
export function shiftByOffset(ms: number, schedule: Schedule): number {
  return ms + schedule.utcOffsetMinutes * MINUTE_MS;
}

// Configuration errors, not client input: `buildApp()` calls this before
// registering routes, so a broken schedule fails the process with a plain
// RangeError (ADR 0004).
export function assertSchedule(schedule: Schedule): void {
  const { utcOffsetMinutes, workdayStartMinute, workdayEndMinute, windowDays } = schedule;
  if (!Number.isInteger(utcOffsetMinutes) || utcOffsetMinutes < -720 || utcOffsetMinutes > 840) {
    throw new RangeError('utcOffsetMinutes must be an integer between -720 and 840.');
  }
  if (
    !Number.isInteger(workdayStartMinute) ||
    !Number.isInteger(workdayEndMinute) ||
    workdayStartMinute < 0 ||
    workdayStartMinute >= workdayEndMinute ||
    workdayEndMinute > 1440
  ) {
    throw new RangeError('Workday minutes must satisfy 0 ≤ start < end ≤ 1440.');
  }
  if (!Number.isInteger(windowDays) || windowDays < 1) {
    throw new RangeError('windowDays must be an integer of at least 1.');
  }
}
