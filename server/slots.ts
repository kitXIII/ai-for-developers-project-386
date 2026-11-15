import { ApiError } from './errors.js';
import type { SlotsDay } from '@app/api/types';

// Slot domain logic per ADR 0002: a pure computation over the injected «сегодня»,
// the meeting type duration and the existing bookings. No clock reads here —
// `now` arrives from `buildApp()` options, so tests can freeze the date.

// UTC+3 is fixed all year (no DST), so calendar math is plain arithmetic on
// epoch milliseconds: shift by +3h and read the components as "UTC".
const UTC3_OFFSET_MS = 3 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

// Working hours in UTC+3 wall-clock minutes: 09:00–18:00 on weekdays.
const DAY_START_MINUTE = 9 * 60;
const DAY_END_MINUTE = 18 * 60;

// The booking window: 14 calendar days starting tomorrow (today is never bookable).
const WINDOW_DAYS = 14;

export type GenerateSlotsInput = {
  // Injected current moment as an ISO instant; the UTC+3 calendar day of this
  // instant is «сегодня».
  now: string;
  durationMinutes: number;
  // Existing bookings of ANY meeting type: a slot must strictly not overlap any
  // of them (`t < конец брони && t + длительность > начало брони`).
  bookings: Array<{ start: string; end: string }>;
};

// Epoch day number (days since 1970-01-01, UTC+3 frame) → calendar date.
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

// `YYYY-MM-DD` for the given epoch day in the UTC+3 frame.
function formatDate(epochDay: number): string {
  const { year, month, day } = civilFromDays(epochDay);
  return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;
}

// Epoch-ms instant → the contract's moment form `YYYY-MM-DDTHH:mm:ss+03:00`
// (responses always carry the +03:00 offset whatever the input offset was).
export function formatUtc3Moment(epochMs: number): string {
  const shifted = epochMs + UTC3_OFFSET_MS;
  const epochDay = Math.floor(shifted / DAY_MS);
  const minuteOfDay = Math.floor((shifted - epochDay * DAY_MS) / MINUTE_MS);
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  return `${formatDate(epochDay)}T${pad2(hours)}:${pad2(minutes)}:00+03:00`;
}

// Monday-based weekday index (0 = Monday … 6 = Sunday); 1970-01-01 was Thursday.
function isWeekend(epochDay: number): boolean {
  return (((epochDay + 3) % 7) + 7) % 7 >= 5;
}

// Strict non-overlap against every booking of any type; touching intervals
// (a slot starting at the moment a booking ends, and vice versa) are allowed.
function isFree(
  busy: Array<{ start: number; end: number }>,
  startMs: number,
  endMs: number,
): boolean {
  return !busy.some((booking) => startMs < booking.end && endMs > booking.start);
}

export function generateAvailableSlots({
  now,
  durationMinutes,
  bookings,
}: GenerateSlotsInput): SlotsDay[] {
  const todayEpochDay = Math.floor((Date.parse(now) + UTC3_OFFSET_MS) / DAY_MS);
  const busy = bookings.map(({ start, end }) => ({
    start: Date.parse(start),
    end: Date.parse(end),
  }));

  const days: SlotsDay[] = [];
  for (let dayOffset = 1; dayOffset <= WINDOW_DAYS; dayOffset += 1) {
    const epochDay = todayEpochDay + dayOffset;
    // Weekends stay inside the window but never offer slots.
    if (isWeekend(epochDay)) {
      continue;
    }

    const slots: SlotsDay['slots'] = [];
    for (
      let minute = DAY_START_MINUTE;
      minute + durationMinutes <= DAY_END_MINUTE;
      minute += durationMinutes
    ) {
      // Wall-clock UTC+3 → epoch ms (shift back by -3h).
      const startMs = epochDay * DAY_MS + minute * MINUTE_MS - UTC3_OFFSET_MS;
      const endMs = startMs + durationMinutes * MINUTE_MS;
      if (isFree(busy, startMs, endMs)) {
        slots.push({ start: formatUtc3Moment(startMs), end: formatUtc3Moment(endMs) });
      }
    }

    // Days without free slots are omitted from the response entirely.
    if (slots.length > 0) {
      days.push({ date: formatDate(epochDay), slots });
    }
  }
  return days;
}

// Re-validates a requested start against the same rules that produce the slot
// list (ADR 0002) — a booking must not bypass them. The checks run in the
// contract's mapping order: window → weekday → grid → day edges → overlap.
// Throws the contract 409 errors; the caller writes the booking right after
// this returns, in the same synchronous section.
export function validateSlotIsBookable({
  now,
  durationMinutes,
  startMs,
  bookings,
}: {
  now: string;
  durationMinutes: number;
  startMs: number;
  bookings: Array<{ start: string; end: string }>;
}): void {
  const todayEpochDay = Math.floor((Date.parse(now) + UTC3_OFFSET_MS) / DAY_MS);
  const startEpochDay = Math.floor((startMs + UTC3_OFFSET_MS) / DAY_MS);
  const dayOffset = startEpochDay - todayEpochDay;
  if (dayOffset < 1 || dayOffset > WINDOW_DAYS) {
    throw new ApiError(
      409,
      'outside_window',
      'Слот вне окна записи: бронировать можно на 14 дней вперёд, начиная с завтрашнего дня.',
    );
  }

  if (isWeekend(startEpochDay)) {
    throw new ApiError(
      409,
      'outside_schedule',
      'Слот вне графика работы: брони доступны только в будние дни.',
    );
  }

  const shifted = startMs + UTC3_OFFSET_MS;
  const minute = Math.floor((((shifted % DAY_MS) + DAY_MS) % DAY_MS) / MINUTE_MS);
  const alignsToMinute = ((shifted % MINUTE_MS) + MINUTE_MS) % MINUTE_MS === 0;
  if (
    !alignsToMinute ||
    minute < DAY_START_MINUTE ||
    (minute - DAY_START_MINUTE) % durationMinutes !== 0
  ) {
    throw new ApiError(
      409,
      'outside_schedule',
      'Слот вне сетки расписания: время начала кратно длительности типа от 09:00 (UTC+3).',
    );
  }

  if (minute + durationMinutes > DAY_END_MINUTE) {
    throw new ApiError(
      409,
      'outside_schedule',
      'Слот вне графика работы: рабочий день заканчивается в 18:00 (UTC+3).',
    );
  }

  const endMs = startMs + durationMinutes * MINUTE_MS;
  const busy = bookings.map(({ start, end }) => ({
    start: Date.parse(start),
    end: Date.parse(end),
  }));
  if (!isFree(busy, startMs, endMs)) {
    throw new ApiError(409, 'slot_taken', 'Это время уже занято. Выберите другой слот.');
  }
}
