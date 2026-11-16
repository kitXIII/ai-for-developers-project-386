import { DomainError } from './errors.js';
import type { Schedule } from './schedule.js';

// The booking rule model (ADR 0002, ADR 0004): the same rules that produce the
// slot list, checked against an epoch-ms instant. Time, duration, busy
// intervals and the schedule arrive as arguments — nothing is read here.
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

// A busy interval of any meeting type: a slot must strictly not overlap any of
// them (`t < конец брони && t + длительность > начало брони`).
export type BusyInterval = {
  startMs: number;
  endMs: number;
};

type SlotCheck = {
  // The frozen «сегодня» in epoch-ms; the calendar day of this instant is today.
  nowMs: number;
  durationMinutes: number;
  startMs: number;
  busy: BusyInterval[];
  schedule: Schedule;
};

// Epoch day number in the schedule's offset frame.
function localEpochDay(ms: number, schedule: Schedule): number {
  return Math.floor((ms + schedule.utcOffsetMinutes * MINUTE_MS) / DAY_MS);
}

// Monday-based weekday index (0 = Monday … 6 = Sunday); 1970-01-01 was Thursday.
function isWeekend(epochDay: number): boolean {
  return (((epochDay + 3) % 7) + 7) % 7 >= 5;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

// Strict non-overlap against every booking of any type; touching intervals
// (a slot starting at the moment a booking ends, and vice versa) are allowed.
function isFree(busy: BusyInterval[], startMs: number, endMs: number): boolean {
  return !busy.some((interval) => startMs < interval.endMs && endMs > interval.startMs);
}

// Re-validates a requested start against the rules that produce the slot list
// (ADR 0002) — a booking must not bypass them. The checks run in the frozen
// order: window → weekday → grid → day end → overlap. Texts are literals at
// the throw site and name the default schedule until it becomes configurable.
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
    throw new DomainError(
      'outside_window',
      'Слот вне окна записи: бронировать можно на 14 дней вперёд, начиная с завтрашнего дня.',
    );
  }

  if (isWeekend(startEpochDay)) {
    throw new DomainError(
      'outside_schedule',
      'Слот вне графика работы: брони доступны только в будние дни.',
    );
  }

  const shifted = startMs + schedule.utcOffsetMinutes * MINUTE_MS;
  const minute = Math.floor(positiveModulo(shifted, DAY_MS) / MINUTE_MS);
  const alignsToMinute = positiveModulo(shifted, MINUTE_MS) === 0;
  if (
    !alignsToMinute ||
    minute < schedule.workdayStartMinute ||
    (minute - schedule.workdayStartMinute) % durationMinutes !== 0
  ) {
    throw new DomainError(
      'outside_schedule',
      'Слот вне сетки расписания: время начала кратно длительности типа от 09:00 (UTC+3).',
    );
  }

  if (minute + durationMinutes > schedule.workdayEndMinute) {
    throw new DomainError(
      'outside_schedule',
      'Слот вне графика работы: рабочий день заканчивается в 18:00 (UTC+3).',
    );
  }

  const endMs = startMs + durationMinutes * MINUTE_MS;
  if (!isFree(busy, startMs, endMs)) {
    throw new DomainError('slot_taken', 'Это время уже занято. Выберите другой слот.');
  }
}
