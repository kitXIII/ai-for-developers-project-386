import type { SlotsInput } from '../../server/slots.js';
import { generateAvailableSlots } from '../../server/slots.js';
import { describe, expect, it } from 'vitest';

// «Сегодня» заморожено: понедельник 16.11.2026 (UTC+3). Окно записи — 17–30 ноября,
// выходные внутри окна — 21–22 и 28–29 (docs/test-plan.md, секция «Юнит»).
const mondayEvening = '2026-11-16T21:30:00+03:00';

function generate(input: Omit<SlotsInput, 'now'>): ReturnType<typeof generateAvailableSlots> {
  return generateAvailableSlots({ now: mondayEvening, ...input });
}

describe('генератор слотов (ADR 0002)', () => {
  it('окно записи D+1…D+14 по UTC+3; сегодня исключён; выходные входят в окно, но слотов не дают', () => {
    const days = generate({ durationMinutes: 30, bookings: [] });

    expect(days.map((day) => day.date)).toEqual([
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
      '2026-11-27',
      '2026-11-30',
    ]);
  });

  it('граница «сегодня» считается по календарю UTC+3, а не по UTC', () => {
    // 21:30 UTC 16.11 — это уже 00:30+03 17.11: «сегодня» по UTC+3 — 17-е, окно начинается 18-го.
    const days = generateAvailableSlots({
      now: '2026-11-16T21:30:00Z',
      durationMinutes: 30,
      bookings: [],
    });

    expect(days[0]?.date).toBe('2026-11-18');
    expect(days.map((day) => day.date)).not.toContain('2026-11-17');
  });

  it('сетка стартов от 09:00 с шагом, равным длительности; хвост дня короче длительности отброшен', () => {
    // Шаг 100 минут: 09:00 + k × 100, старт 17:20 не влезает (19:00 > 18:00) — сетка не сдвигается.
    const days = generate({ durationMinutes: 100, bookings: [] });

    expect(days[0]?.slots).toEqual([
      { start: '2026-11-17T09:00:00+03:00', end: '2026-11-17T10:40:00+03:00' },
      { start: '2026-11-17T10:40:00+03:00', end: '2026-11-17T12:20:00+03:00' },
      { start: '2026-11-17T12:20:00+03:00', end: '2026-11-17T14:00:00+03:00' },
      { start: '2026-11-17T14:00:00+03:00', end: '2026-11-17T15:40:00+03:00' },
      { start: '2026-11-17T15:40:00+03:00', end: '2026-11-17T17:20:00+03:00' },
    ]);
  });

  it('моменты сериализуются со смещением +03:00, дата — YYYY-MM-DD по UTC+3', () => {
    const days = generate({ durationMinutes: 30, bookings: [] });

    for (const day of days) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const slot of day.slots) {
        expect(slot.start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+03:00$/);
        expect(slot.end).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+03:00$/);
      }
    }
  });

  it('строгое непересечение с бронями любого типа; стык-в-стык разрешён', () => {
    // Бронь 11:00–13:00+03 другого типа (120 минут) накрывает четыре получасовых старта;
    // на входе смещение +00:00 — сравниваются инстанты, а не настенные часы.
    const days = generate({
      durationMinutes: 30,
      bookings: [{ start: '2026-11-17T08:00:00Z', end: '2026-11-17T10:00:00Z' }],
    });

    const starts = days[0]?.slots.map((slot) => slot.start.slice(11, 16));
    expect(starts).not.toContain('11:00');
    expect(starts).not.toContain('11:30');
    expect(starts).not.toContain('12:00');
    expect(starts).not.toContain('12:30');
    expect(starts).toContain('10:30'); // конец слота = начало брони
    expect(starts).toContain('13:00'); // начало слота = конец брони — стык разрешён
  });

  it('частичное наложение: конец чужой брони не выровнен по сетке типа', () => {
    // Бронь 09:00–10:40+03 (100 минут): её конец не кратен получасовой сетке,
    // поэтому старты 10:00 и 10:30 накрываются частично, а 11:00 — чистый стык.
    const days = generate({
      durationMinutes: 30,
      bookings: [{ start: '2026-11-17T09:00:00+03:00', end: '2026-11-17T10:40:00+03:00' }],
    });

    const starts = days[0]?.slots.map((slot) => slot.start.slice(11, 16));
    expect(starts).not.toContain('10:30');
    expect(starts).not.toContain('10:00');
    expect(starts).toContain('11:00');
  });

  it('день, полностью занятый бронями, отсутствует в ответе', () => {
    // Бронь 09:00–18:00+03 накрывает весь рабочий день 17 ноября.
    const days = generate({
      durationMinutes: 30,
      bookings: [{ start: '2026-11-17T06:00:00Z', end: '2026-11-17T15:00:00Z' }],
    });

    expect(days.map((day) => day.date)).not.toContain('2026-11-17');
  });

  it('граница длительности 5 минут: слоты каждые 5 минут, последний 17:55–18:00', () => {
    const days = generate({ durationMinutes: 5, bookings: [] });

    expect(days[0]?.slots).toHaveLength(108); // 9 часов × 12 слотов в час
    expect(days[0]?.slots.at(0)).toEqual({
      start: '2026-11-17T09:00:00+03:00',
      end: '2026-11-17T09:05:00+03:00',
    });
    expect(days[0]?.slots.at(-1)).toEqual({
      start: '2026-11-17T17:55:00+03:00',
      end: '2026-11-17T18:00:00+03:00',
    });
  });

  it('граница длительности 540 минут: единственный слот 09:00–18:00', () => {
    const days = generate({ durationMinutes: 540, bookings: [] });

    expect(days.map((day) => day.date)).toEqual([
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
      '2026-11-27',
      '2026-11-30',
    ]);
    expect(days[0]?.slots).toEqual([
      { start: '2026-11-17T09:00:00+03:00', end: '2026-11-17T18:00:00+03:00' },
    ]);
  });
});
