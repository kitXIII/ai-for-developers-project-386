// PROTOTYPE (тикет #19): форма контракта — забота адаптера, поэтому форматирование
// момента живёт здесь, а не в моделях.
import type { Schedule } from '../models/schedule.js';

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

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

// `YYYY-MM-DDTHH:mm:ss+03:00` (смещение берётся из настроек расписания).
export function formatMoment(instantMs: number, schedule: Schedule): string {
  const shifted = instantMs + schedule.utcOffsetMinutes * MINUTE_MS;
  const epochDay = Math.floor(shifted / DAY_MS);
  const minuteOfDay = Math.floor((shifted - epochDay * DAY_MS) / MINUTE_MS);
  const { year, month, day } = civilFromDays(epochDay);
  const sign = schedule.utcOffsetMinutes < 0 ? '-' : '+';
  const offset = Math.abs(schedule.utcOffsetMinutes);
  const offsetHours = pad2(Math.floor(offset / 60));
  const offsetMinutes = pad2(offset % 60);
  return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}T${pad2(
    Math.floor(minuteOfDay / 60),
  )}:${pad2(minuteOfDay % 60)}:00${sign}${offsetHours}:${offsetMinutes}`;
}
