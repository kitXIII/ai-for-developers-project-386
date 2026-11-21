import type { Booking } from './booking.js';
import { DomainError } from './errors.js';
import { DAY_MS, MINUTE_MS, shiftByOffset, type Schedule } from './schedule.js';

// The booking rule model (ADR 0002, ADR 0004): the same rules that produce the
// slot list, checked against an epoch-ms instant. Time, duration, busy
// intervals and the schedule arrive as arguments — nothing is read here.

// One bookable interval in epoch-ms: the adapter formats it, the model never
// builds strings (ADR 0004).
export type Slot = {
  startMs: number;
  endMs: number;
};

// A busy interval of any meeting type: a slot must strictly not overlap any of
// them (`t < конец брони && t + длительность > начало брони`).
export type BusyInterval = {
  startMs: number;
  endMs: number;
};

// The busy set of a scenario: every stored booking as an interval, whatever its
// type (a booking IS an interval, so no per-call mapping is left to services).
export function busyIntervals(bookings: Booking[]): BusyInterval[] {
  return bookings.map(({ startMs, endMs }) => ({ startMs, endMs }));
}

// One day of the calendar in epoch-ms: the local midnight of the day and the
// free intervals in it; the adapter formats both (ADR 0004).
export type SlotsDay = {
  dayStartMs: number;
  slots: Slot[];
};

type SlotCheck = {
  // The frozen «сегодня» in epoch-ms; the calendar day of this instant is today.
  nowMs: number;
  durationMinutes: number;
  startMs: number;
  busy: BusyInterval[];
  schedule: Schedule;
};

type GenerateSlotsInput = {
  nowMs: number;
  durationMinutes: number;
  busy: BusyInterval[];
  schedule: Schedule;
};

// Epoch day number in the schedule's offset frame.
function localEpochDay(ms: number, schedule: Schedule): number {
  return Math.floor(shiftByOffset(ms, schedule) / DAY_MS);
}

// Monday-based weekday index (0 = Monday … 6 = Sunday); 1970-01-01 was Thursday.
function isWeekend(epochDay: number): boolean {
  return (((epochDay + 3) % 7) + 7) % 7 >= 5;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

// Local midnight of an epoch day in the schedule's offset frame.
function dayStartOf(epochDay: number, schedule: Schedule): number {
  return epochDay * DAY_MS - schedule.utcOffsetMinutes * MINUTE_MS;
}

// A start fits the workday when its end does not outrun it (ADR 0002).
function fitsWorkday(minute: number, durationMinutes: number, schedule: Schedule): boolean {
  return minute + durationMinutes <= schedule.workdayEndMinute;
}

// A start lands on the fixed grid: from the workday start with the duration as
// the step. Whether it also fits the workday is `fitsWorkday`.
function isGridStart(minute: number, durationMinutes: number, schedule: Schedule): boolean {
  return (
    minute >= schedule.workdayStartMinute &&
    (minute - schedule.workdayStartMinute) % durationMinutes === 0
  );
}

// The fixed grid of a day: the tail shorter than the duration is dropped, so
// the grid is neither shifted nor extended to the end of the workday.
function slotGrid(dayStartMs: number, durationMinutes: number, schedule: Schedule): Slot[] {
  const slots: Slot[] = [];
  for (
    let minute = schedule.workdayStartMinute;
    fitsWorkday(minute, durationMinutes, schedule);
    minute += durationMinutes
  ) {
    const startMs = dayStartMs + minute * MINUTE_MS;
    slots.push({ startMs, endMs: startMs + durationMinutes * MINUTE_MS });
  }
  return slots;
}

// Strict non-overlap against every booking of any type; touching intervals
// (a slot starting at the moment a booking ends, and vice versa) are allowed.
function isFree(busy: BusyInterval[], startMs: number, endMs: number): boolean {
  return !busy.some((interval) => startMs < interval.endMs && endMs > interval.startMs);
}

// Re-validates a requested start against the rules that produce the slot list
// (ADR 0002) — a booking must not bypass them. The checks run in the frozen
// order: window → weekday → grid → day end → overlap. Keys are literals at the
// throw site and name the default schedule until it becomes configurable.
export function assertSlotBookable({
  nowMs,
  durationMinutes,
  startMs,
  busy,
  schedule,
}: SlotCheck): void {
  const todayEpochDay = localEpochDay(nowMs, schedule);
  const startEpochDay = localEpochDay(startMs, schedule);
  const dayOffset = startEpochDay - todayEpochDay;
  if (dayOffset < 1 || dayOffset > schedule.windowDays) {
    throw new DomainError('outside_window', 'errors.domain.slots.outsideWindow');
  }

  if (isWeekend(startEpochDay)) {
    throw new DomainError('outside_schedule', 'errors.domain.slots.weekend');
  }

  const shifted = shiftByOffset(startMs, schedule);
  const minute = Math.floor(positiveModulo(shifted, DAY_MS) / MINUTE_MS);
  const alignsToMinute = positiveModulo(shifted, MINUTE_MS) === 0;
  if (!alignsToMinute || !isGridStart(minute, durationMinutes, schedule)) {
    throw new DomainError('outside_schedule', 'errors.domain.slots.grid');
  }

  if (!fitsWorkday(minute, durationMinutes, schedule)) {
    throw new DomainError('outside_schedule', 'errors.domain.slots.workdayEnd');
  }

  const endMs = startMs + durationMinutes * MINUTE_MS;
  if (!isFree(busy, startMs, endMs)) {
    throw new DomainError('slot_taken', 'errors.domain.slots.taken');
  }
}

// The calendar of free slots (ADR 0002, ADR 0004): the window D+1…D+N by the
// local calendar, weekdays only, the fixed grid of each day, and a slot is free
// when it does not overlap any booking of any type. Days without free slots are
// omitted entirely. Everything stays in epoch-ms; the adapter formats it.
export function generateSlots({
  nowMs,
  durationMinutes,
  busy,
  schedule,
}: GenerateSlotsInput): SlotsDay[] {
  const todayEpochDay = localEpochDay(nowMs, schedule);
  const days: SlotsDay[] = [];

  for (let dayOffset = 1; dayOffset <= schedule.windowDays; dayOffset += 1) {
    const epochDay = todayEpochDay + dayOffset;
    // Weekends stay inside the window but never offer slots.
    if (isWeekend(epochDay)) {
      continue;
    }

    const dayStartMs = dayStartOf(epochDay, schedule);
    const slots = slotGrid(dayStartMs, durationMinutes, schedule).filter(({ startMs, endMs }) =>
      isFree(busy, startMs, endMs),
    );

    // Days without free slots are omitted from the response entirely.
    if (slots.length > 0) {
      days.push({ dayStartMs, slots });
    }
  }

  return days;
}
