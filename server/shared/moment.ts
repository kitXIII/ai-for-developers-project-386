import type { Schedule } from '../models/schedule.js';

// The contract's moment form `YYYY-MM-DDTHH:mm:ss+03:00` built from epoch-ms
// (ADR 0004): formatting is the adapter's concern, the domain never sees strings.
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

// Epoch day number (days since 1970-01-01 in the shifted frame) → calendar date.
// Howard Hinnant's civil_from_days algorithm.
function civilFromDays(epochDay: number): { year: number; month: number; day: number } {
  const z = epochDay + 719_468;
  const era = Math.floor(z / 146_097);
  const dayOfEra = z - era * 146_097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36_524) -
      Math.floor(dayOfEra / 146_096)) /
      365,
  );
  const year = yearOfEra + era * 400;
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const monthIndex = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * monthIndex + 2) / 5) + 1;
  const month = monthIndex < 10 ? monthIndex + 3 : monthIndex - 9;
  return { year: month <= 2 ? year + 1 : year, month, day };
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

// Epoch-ms instant → the contract moment in the schedule's offset. Seconds are
// truncated to `:00` (the contract's granularity), the offset comes from the
// settings, never from the input moment.
export function formatMoment(epochMs: number, schedule: Schedule): string {
  const offsetMs = schedule.utcOffsetMinutes * MINUTE_MS;
  const shifted = epochMs + offsetMs;
  const epochDay = Math.floor(shifted / DAY_MS);
  const minuteOfDay = Math.floor((shifted - epochDay * DAY_MS) / MINUTE_MS);
  const { year, month, day } = civilFromDays(epochDay);
  const date = `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;

  const sign = schedule.utcOffsetMinutes < 0 ? '-' : '+';
  const absoluteOffset = Math.abs(schedule.utcOffsetMinutes);
  const offset = `${sign}${pad2(Math.floor(absoluteOffset / 60))}:${pad2(absoluteOffset % 60)}`;

  return `${date}T${pad2(Math.floor(minuteOfDay / 60))}:${pad2(minuteOfDay % 60)}:00${offset}`;
}
