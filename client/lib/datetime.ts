import dayjs from 'dayjs';

// Moments always carry the +03:00 offset (ADR 0002), so the wall-clock parts
// are plain substrings of the contract's moment form — no timezone conversions
// in the UI. The ru locale is registered globally in `main.tsx`.

// `D MMMM` in the ru locale: for the date part of a moment (`YYYY-MM-DD…`) or
// a plain `YYYY-MM-DD` day of the slots calendar — both slice to the date.
export function dayLabel(moment: string): string {
  return dayjs(moment.slice(0, 10)).locale('ru').format('D MMMM');
}

// `ЧЧ:ММ–ЧЧ:ММ` from the start/end pair of a slot or a booking.
export function timeRangeLabel(start: string, end: string): string {
  return `${start.slice(11, 16)}–${end.slice(11, 16)}`;
}
