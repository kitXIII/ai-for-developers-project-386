import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../server/models/errors.js';
import type { Schedule } from '../../../server/models/schedule.js';
import { assertSlotBookable, type BusyInterval } from '../../../server/models/slots.js';
import { FROZEN_NOW_MS, localDate, ms, TEST_SCHEDULE } from '../fixtures.js';

// The booking rule model (ADR 0002, ADR 0004): the same rules that produce the
// slot list, checked against an epoch-ms instant. Texts are not pinned, kinds
// are — the adapter maps them to contract codes.
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
});
