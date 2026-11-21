import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../server/models/errors.js';
import type { Schedule } from '../../../server/models/schedule.js';
import {
  assertSlotBookable,
  generateSlots,
  type BusyInterval,
} from '../../../server/models/slots.js';
import { FROZEN_NOW_MS, localDate, ms, TEST_SCHEDULE } from '../fixtures.js';

// The booking rule model (ADR 0002, ADR 0004): the same rules that produce the
// slot list, checked against an epoch-ms instant. Wording is not pinned, kinds
// and keys are — the adapter maps kinds to codes and keys to phrases (ADR 0007).
type CheckInput = {
  nowMs?: number;
  durationMinutes?: number;
  startMs: number;
  busy?: BusyInterval[];
  schedule?: Schedule;
};

function startOf(dayOffset: number, time: string): number {
  return ms(`${localDate(dayOffset)}T${time}+03:00`);
}

function dayStartOf(dayOffset: number): number {
  return startOf(dayOffset, '00:00:00');
}

// The weekdays of the frozen window D+1…D+14: 17–20, 23–27 and 30 November;
// the weekends inside it give no slots and therefore no days.
const windowDayOffsets = [1, 2, 3, 4, 7, 8, 9, 10, 11, 14];

function kindOf(run: () => void): string {
  try {
    run();
  } catch (error) {
    if (error instanceof DomainError) {
      return error.kind;
    }
    throw error;
  }
  throw new Error('Expected the model to throw a DomainError');
}

function keyOf(run: () => void): string {
  try {
    run();
  } catch (error) {
    if (error instanceof DomainError) {
      return error.key;
    }
    throw error;
  }
  throw new Error('Expected the model to throw a DomainError');
}

function check({
  nowMs = FROZEN_NOW_MS,
  durationMinutes = 30,
  startMs,
  busy = [],
  schedule = TEST_SCHEDULE,
}: CheckInput): void {
  assertSlotBookable({ nowMs, durationMinutes, startMs, busy, schedule });
}

describe('assertSlotBookable', () => {
  it('принимает слот по сетке в рабочее время', () => {
    expect(() => check({ startMs: startOf(1, '09:00:00') })).not.toThrow();
  });

  it('разрешает стык в момент окончания чужой брони', () => {
    const touchingBefore: BusyInterval[] = [
      { startMs: startOf(1, '08:30:00'), endMs: startOf(1, '09:00:00') },
    ];
    const touchingAfter: BusyInterval[] = [
      { startMs: startOf(1, '09:00:00'), endMs: startOf(1, '09:30:00') },
    ];

    expect(() => check({ startMs: startOf(1, '09:00:00'), busy: touchingBefore })).not.toThrow();
    expect(() => check({ startMs: startOf(1, '09:30:00'), busy: touchingAfter })).not.toThrow();
  });

  it('отклоняет сегодня и день за окном записи как outside_window', () => {
    expect(kindOf(() => check({ startMs: startOf(0, '10:00:00') }))).toBe('outside_window');
    expect(kindOf(() => check({ startMs: startOf(15, '10:00:00') }))).toBe('outside_window');
  });

  it('принимает последний день окна', () => {
    expect(() => check({ startMs: startOf(14, '10:00:00') })).not.toThrow();
  });

  it('берёт размер окна из расписания', () => {
    expect(
      kindOf(() =>
        check({
          startMs: startOf(2, '10:00:00'),
          schedule: { ...TEST_SCHEDULE, windowDays: 1 },
        }),
      ),
    ).toBe('outside_window');
  });

  it('отклоняет выходной как outside_schedule', () => {
    // 21.11.2026 is a Saturday inside the window.
    expect(kindOf(() => check({ startMs: startOf(5, '10:00:00') }))).toBe('outside_schedule');
  });

  it('отклоняет старт вне сетки как outside_schedule', () => {
    expect(kindOf(() => check({ startMs: startOf(1, '10:10:00') }))).toBe('outside_schedule');
    expect(kindOf(() => check({ startMs: startOf(1, '08:30:00') }))).toBe('outside_schedule');
    // Seconds make the start non-integral even on a grid-aligned minute.
    expect(kindOf(() => check({ startMs: startOf(1, '09:00:30') }))).toBe('outside_schedule');
  });

  it('отклоняет слот, выходящий за конец рабочего дня, как outside_schedule', () => {
    expect(() => check({ startMs: startOf(1, '17:30:00') })).not.toThrow();
    expect(kindOf(() => check({ startMs: startOf(1, '18:00:00') }))).toBe('outside_schedule');
  });

  it('отклоняет пересечение с бронью как slot_taken', () => {
    const busy: BusyInterval[] = [
      { startMs: startOf(1, '09:00:00'), endMs: startOf(1, '10:40:00') },
    ];

    // 10:30 is on the 30-minute grid but only partially overlaps the longer booking.
    expect(kindOf(() => check({ startMs: startOf(1, '10:30:00'), busy }))).toBe('slot_taken');
    expect(() => check({ startMs: startOf(1, '11:00:00'), busy })).not.toThrow();
  });

  it('держит приоритет видов: окно → выходной → сетка → конец дня → занятость', () => {
    const busyEverywhere: BusyInterval[] = [
      { startMs: startOf(0, '00:00:00'), endMs: startOf(20, '00:00:00') },
    ];

    // A weekend beyond the window is still outside_window.
    expect(kindOf(() => check({ startMs: startOf(20, '10:00:00'), busy: busyEverywhere }))).toBe(
      'outside_window',
    );
    // A weekend inside the window wins over the overlap.
    expect(kindOf(() => check({ startMs: startOf(5, '10:00:00'), busy: busyEverywhere }))).toBe(
      'outside_schedule',
    );
    // An off-grid weekday start wins over the overlap too.
    expect(kindOf(() => check({ startMs: startOf(1, '10:10:00'), busy: busyEverywhere }))).toBe(
      'outside_schedule',
    );
    // The end of the working day wins over the overlap.
    expect(kindOf(() => check({ startMs: startOf(1, '18:00:00'), busy: busyEverywhere }))).toBe(
      'outside_schedule',
    );
  });

  it('называет ключ каталога у каждой причины', () => {
    const busy: BusyInterval[] = [
      { startMs: startOf(1, '09:00:00'), endMs: startOf(1, '10:40:00') },
    ];
    const cases: [() => void, string][] = [
      [() => check({ startMs: startOf(0, '10:00:00') }), 'errors.domain.slots.outsideWindow'],
      [() => check({ startMs: startOf(5, '10:00:00') }), 'errors.domain.slots.weekend'],
      [() => check({ startMs: startOf(1, '10:10:00') }), 'errors.domain.slots.grid'],
      [() => check({ startMs: startOf(1, '18:00:00') }), 'errors.domain.slots.workdayEnd'],
      [() => check({ startMs: startOf(1, '10:30:00'), busy }), 'errors.domain.slots.taken'],
    ];

    for (const [run, key] of cases) {
      expect(keyOf(run)).toBe(key);
    }
  });
});

// The same rules in the other direction (ADR 0002): the model builds the
// calendar in epoch-ms, the adapter is the only place that formats moments.
describe('generateSlots', () => {
  type GenerateInput = {
    nowMs?: number;
    durationMinutes?: number;
    busy?: BusyInterval[];
    schedule?: Schedule;
  };

  function generate({
    nowMs = FROZEN_NOW_MS,
    durationMinutes = 30,
    busy = [],
    schedule = TEST_SCHEDULE,
  }: GenerateInput = {}) {
    return generateSlots({ nowMs, durationMinutes, busy, schedule });
  }

  it('окно D+1…D+14 по локальной дате; сегодня исключён; выходные в окне слотов не дают', () => {
    const days = generate();

    expect(days.map((day) => day.dayStartMs)).toEqual(windowDayOffsets.map(dayStartOf));
    for (const day of days) {
      expect(day.slots.length, 'every returned day has slots').toBeGreaterThan(0);
    }
  });

  it('граница «сегодня» считается по локальному календарю, а не по UTC', () => {
    // 21:30 UTC 16.11 is already 00:30+03 on 17.11: today is the 17th and the
    // window starts on the 18th.
    const days = generate({ nowMs: ms('2026-11-16T21:30:00Z') });

    expect(days[0]?.dayStartMs).toBe(ms('2026-11-18T00:00:00+03:00'));
    expect(days.map((day) => day.dayStartMs)).not.toContain(ms('2026-11-17T00:00:00+03:00'));
  });

  it('сетка стартов от начала рабочего дня с шагом длительности; хвост дня отброшен', () => {
    // Step 100 minutes: 09:00 + k × 100; the 17:20 start does not fit (19:00 >
    // 18:00), so the grid is neither shifted nor extended.
    const days = generate({ durationMinutes: 100 });

    expect(days[0]?.slots).toEqual([
      { startMs: startOf(1, '09:00:00'), endMs: startOf(1, '10:40:00') },
      { startMs: startOf(1, '10:40:00'), endMs: startOf(1, '12:20:00') },
      { startMs: startOf(1, '12:20:00'), endMs: startOf(1, '14:00:00') },
      { startMs: startOf(1, '14:00:00'), endMs: startOf(1, '15:40:00') },
      { startMs: startOf(1, '15:40:00'), endMs: startOf(1, '17:20:00') },
    ]);
  });

  it('строгое непересечение с бронями любого типа; стык-в-стык разрешён', () => {
    // 11:00–13:00+03 of another type covers four 30-minute starts; the input
    // carries +00:00, so instants are compared, not wall-clock strings.
    const days = generate({
      busy: [{ startMs: ms('2026-11-17T08:00:00Z'), endMs: ms('2026-11-17T10:00:00Z') }],
    });

    const starts = days[0]?.slots.map((slot) => slot.startMs);
    expect(starts).not.toContain(startOf(1, '11:00:00'));
    expect(starts).not.toContain(startOf(1, '11:30:00'));
    expect(starts).not.toContain(startOf(1, '12:00:00'));
    expect(starts).not.toContain(startOf(1, '12:30:00'));
    expect(starts).toContain(startOf(1, '10:30:00')); // slot end = booking start
    expect(starts).toContain(startOf(1, '13:00:00')); // slot start = booking end
  });

  it('частичное наложение: конец чужой брони не выровнен по сетке типа', () => {
    // 09:00–10:40+03 (100 minutes): its end is not a multiple of the
    // 30-minute grid, so 10:00 and 10:30 overlap partially, 11:00 touches it.
    const days = generate({
      busy: [{ startMs: startOf(1, '09:00:00'), endMs: startOf(1, '10:40:00') }],
    });

    const starts = days[0]?.slots.map((slot) => slot.startMs);
    expect(starts).not.toContain(startOf(1, '10:00:00'));
    expect(starts).not.toContain(startOf(1, '10:30:00'));
    expect(starts).toContain(startOf(1, '11:00:00'));
  });

  it('день, полностью занятый бронями, отсутствует в ответе', () => {
    // 09:00–18:00+03 covers the whole working day of 17 November.
    const days = generate({
      busy: [{ startMs: ms('2026-11-17T06:00:00Z'), endMs: ms('2026-11-17T15:00:00Z') }],
    });

    expect(days.map((day) => day.dayStartMs)).not.toContain(dayStartOf(1));
  });

  it('граница длительности 5 минут: слоты каждые 5 минут, последний 17:55–18:00', () => {
    const days = generate({ durationMinutes: 5 });

    expect(days[0]?.slots).toHaveLength(108); // 9 hours × 12 slots per hour
    expect(days[0]?.slots.at(0)).toEqual({
      startMs: startOf(1, '09:00:00'),
      endMs: startOf(1, '09:05:00'),
    });
    expect(days[0]?.slots.at(-1)).toEqual({
      startMs: startOf(1, '17:55:00'),
      endMs: startOf(1, '18:00:00'),
    });
  });

  it('граница длительности 540 минут: единственный слот 09:00–18:00', () => {
    const days = generate({ durationMinutes: 540 });

    expect(days.map((day) => day.dayStartMs)).toEqual(windowDayOffsets.map(dayStartOf));
    expect(days[0]?.slots).toEqual([
      { startMs: startOf(1, '09:00:00'), endMs: startOf(1, '18:00:00') },
    ]);
  });
});
