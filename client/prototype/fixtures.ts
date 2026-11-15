// ПРОТОТИП (тикет «Спека: UX-потоки трёх сценариев»): ин-memory фикстуры, read-only.
// Формы данных следуют контракту @app/api/types, но API не вызывается.
import type { Booking, GuestMeetingType, Slot, SlotsDay } from '@app/api/types';

export const MEETING_TYPES: GuestMeetingType[] = [
  {
    id: 'f2a6c1e0-0001-4000-8000-000000000001',
    name: 'Знакомство',
    description: 'Короткий созвон: обсудим задачу и поймём, чем можно помочь.',
    durationMinutes: 15,
  },
  {
    id: 'f2a6c1e0-0002-4000-8000-000000000002',
    name: 'Консультация',
    description: 'Разбор вопроса с экспертом. Пришлите материалы заранее в ответном письме.',
    durationMinutes: 30,
  },
  {
    id: 'f2a6c1e0-0003-4000-8000-000000000003',
    name: 'Ревью проекта',
    description: 'Подробное обсуждение проекта: архитектура, риски, план работ.',
    durationMinutes: 60,
  },
];

// Занятые интервалы владельца в минутах от полуночи UTC+3 (одинаково блокируют все типы).
const BUSY: Array<{ dayOffset: number; from: number; to: number }> = [
  { dayOffset: 1, from: 13 * 60, to: 14 * 60 },
  { dayOffset: 2, from: 9 * 60, to: 10 * 60 + 30 },
];

const DAY_START = 9 * 60;
const DAY_END = 18 * 60;

function formatTime(minutes: number): string {
  return (
    String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0')
  );
}

export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDay(date: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }).format(new Date(date + 'T00:00:00+03:00'));
}

// Слоты вычисляются на лету (ADR 0002): окно D+1…D+14, сетка от 09:00 с шагом = длительности,
// пустые дни (выходные) опускаются, стык с занятым интервалом разрешён.
export function slotsForType(type: GuestMeetingType): SlotsDay[] {
  const days: SlotsDay[] = [];
  const today = new Date();
  for (let offset = 1; offset <= 14; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) continue;
    const iso = toIsoDate(date);
    const busy = BUSY.filter((b) => b.dayOffset === offset);
    const slots: Slot[] = [];
    for (
      let start = DAY_START;
      start + type.durationMinutes <= DAY_END;
      start += type.durationMinutes
    ) {
      const end = start + type.durationMinutes;
      const overlaps = busy.some((b) => start < b.to && end > b.from);
      if (overlaps) continue;
      slots.push({
        start: `${iso}T${formatTime(start)}:00+03:00`,
        end: `${iso}T${formatTime(end)}:00+03:00`,
      });
    }
    if (slots.length > 0) days.push({ date: iso, slots });
  }
  return days;
}

export const BOOKINGS: Booking[] = [
  {
    id: 'a1b2c3d4-0001-4000-8000-00000000000a',
    meetingTypeId: MEETING_TYPES[1].id,
    meetingTypeName: MEETING_TYPES[1].name,
    guestName: 'Анна Смирнова',
    start: '2026-11-17T11:00:00+03:00',
    end: '2026-11-17T11:30:00+03:00',
  },
  {
    id: 'a1b2c3d4-0002-4000-8000-00000000000b',
    meetingTypeId: MEETING_TYPES[0].id,
    meetingTypeName: MEETING_TYPES[0].name,
    guestName: 'Пётр Иванов',
    start: '2026-11-18T09:15:00+03:00',
    end: '2026-11-18T09:30:00+03:00',
  },
  {
    id: 'a1b2c3d4-0003-4000-8000-00000000000c',
    meetingTypeId: MEETING_TYPES[2].id,
    meetingTypeName: MEETING_TYPES[2].name,
    guestName: 'Мария Ковалёва',
    start: '2026-11-20T15:00:00+03:00',
    end: '2026-11-20T16:00:00+03:00',
  },
];
