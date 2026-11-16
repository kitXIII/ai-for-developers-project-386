import { describe, expect, it } from 'vitest';
import { formatMoment } from '../../../server/shared/moment.js';
import { ms, TEST_SCHEDULE } from '../fixtures.js';

// The adapter formatting seam (ADR 0004): the domain stays in epoch-ms and
// only this function turns an instant into the contract's offset moment.
describe('formatMoment', () => {
  it('сериализует момент в +03:00 по расписанию по умолчанию', () => {
    expect(formatMoment(ms('2026-11-17T09:00:00+03:00'), TEST_SCHEDULE)).toBe(
      '2026-11-17T09:00:00+03:00',
    );
  });

  it('берёт отрицательное смещение из настроек', () => {
    // 14:00 UTC is 09:00 in UTC-5.
    expect(
      formatMoment(ms('2026-11-17T14:00:00Z'), { ...TEST_SCHEDULE, utcOffsetMinutes: -300 }),
    ).toBe('2026-11-17T09:00:00-05:00');
  });

  it('переходит через полночь по локальной дате', () => {
    // 22:30 UTC is already the next day in UTC+3.
    expect(formatMoment(ms('2026-11-16T22:30:00Z'), TEST_SCHEDULE)).toBe(
      '2026-11-17T01:30:00+03:00',
    );
  });

  it('отбрасывает секунды: момент всегда заканчивается на :00', () => {
    expect(formatMoment(ms('2026-11-17T09:00:45+03:00'), TEST_SCHEDULE)).toBe(
      '2026-11-17T09:00:00+03:00',
    );
  });
});
