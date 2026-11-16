// PROTOTYPE (тикет #19): правила слотов из ADR 0002, но без HTTP и без контрактных
// строк: на вход epoch-ms, на выход epoch-ms-интервалы. Настройки — параметр.
import type { Schedule } from './schedule.js';
import { DomainError } from './errors.js';

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

type BusyInterval = { startMs: number; endMs: number };

export type SlotsQuery = {
  nowMs: number;
  durationMinutes: number;
  busy: BusyInterval[];
  schedule: Schedule;
};

function offsetMs(schedule: Schedule): number {
  return schedule.utcOffsetMinutes * MINUTE_MS;
}

// Номер дня (в местном времени) → календарная дата; алгоритм civil_from_days.
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

function formatDate(epochDay: number): string {
  const { year, month, day } = civilFromDays(epochDay);
  return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;
}

function isWeekend(epochDay: number): boolean {
  return (((epochDay + 3) % 7) + 7) % 7 >= 5;
}

function isFree(busy: BusyInterval[], startMs: number, endMs: number): boolean {
  return !busy.some((interval) => startMs < interval.endMs && endMs > interval.startMs);
}

function localEpochDay(instantMs: number, schedule: Schedule): number {
  return Math.floor((instantMs + offsetMs(schedule)) / DAY_MS);
}

type SlotDay = { date: string; slots: Array<{ startMs: number; endMs: number }> };

export function generateSlots({ nowMs, durationMinutes, busy, schedule }: SlotsQuery): SlotDay[] {
  const today = localEpochDay(nowMs, schedule);
  const days: SlotDay[] = [];

  for (let offset = 1; offset <= schedule.windowDays; offset += 1) {
    const epochDay = today + offset;
    if (isWeekend(epochDay)) {
      continue;
    }

    const slots: SlotDay['slots'] = [];
    for (
      let minute = schedule.workdayStartMinute;
      minute + durationMinutes <= schedule.workdayEndMinute;
      minute += durationMinutes
    ) {
      const startMs = epochDay * DAY_MS + minute * MINUTE_MS - offsetMs(schedule);
      const endMs = startMs + durationMinutes * MINUTE_MS;
      if (isFree(busy, startMs, endMs)) {
        slots.push({ startMs, endMs });
      }
    }

    if (slots.length > 0) {
      days.push({ date: formatDate(epochDay), slots });
    }
  }
  return days;
}

// Перевалидация запрошенного старта теми же правилами, что дают список слотов.
export function assertSlotBookable(
  { nowMs, durationMinutes, busy, schedule }: SlotsQuery,
  startMs: number,
): void {
  const dayOffset = localEpochDay(startMs, schedule) - localEpochDay(nowMs, schedule);
  if (dayOffset < 1 || dayOffset > schedule.windowDays) {
    throw new DomainError(
      'outside_window',
      'Слот вне окна записи: бронировать можно на 14 дней вперёд, начиная с завтрашнего дня.',
    );
  }

  const startEpochDay = localEpochDay(startMs, schedule);
  if (isWeekend(startEpochDay)) {
    throw new DomainError(
      'outside_schedule',
      'Слот вне графика работы: брони доступны только в будние дни.',
    );
  }

  const shifted = startMs + offsetMs(schedule);
  const minute = Math.floor((((shifted % DAY_MS) + DAY_MS) % DAY_MS) / MINUTE_MS);
  const alignsToMinute = ((shifted % MINUTE_MS) + MINUTE_MS) % MINUTE_MS === 0;
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

  if (!isFree(busy, startMs, startMs + durationMinutes * MINUTE_MS)) {
    throw new DomainError('slot_taken', 'Это время уже занято. Выберите другой слот.');
  }
}
