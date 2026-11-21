import { describe, expect, it } from 'vitest';
import { draftBooking, parseGuestName } from '../../../server/models/booking.js';
import { DomainError } from '../../../server/models/errors.js';
import type { MeetingType } from '../../../server/models/meeting-type.js';
import { ms } from '../fixtures.js';

// The booking model owns its value invariants (ADR 0004). Wording is not
// pinned: the matrix checks the error kind, the key is checked once — the
// catalog decides the phrase (ADR 0007).
const meetingType: MeetingType = {
  id: 'meeting-type-1',
  name: 'Знакомство',
  description: 'Короткий видеозвонок',
  durationMinutes: 30,
};

function captureDomainError(run: () => void): DomainError {
  try {
    run();
  } catch (error) {
    if (error instanceof DomainError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected the model to throw a DomainError');
}

describe('parseGuestName', () => {
  it('принимает имя по правилам', () => {
    expect(parseGuestName('Мария Петрова')).toBe('Мария Петрова');
  });

  it.each([
    ['имя отсутствует', undefined],
    ['имя — не строка', 42],
    ['имя пустое', ''],
    ['имя из одних пробелов', '   '],
    ['имя с пробелом в начале', ' Мария'],
    ['имя с пробелом в конце', 'Мария '],
    ['имя длиннее 100 символов', 'а'.repeat(101)],
  ])('бросает invalid_value: %s', (_title, value) => {
    expect(captureDomainError(() => parseGuestName(value)).kind).toBe('invalid_value');
  });

  it('называет ключ каталога', () => {
    expect(captureDomainError(() => parseGuestName('')).key).toBe(
      'errors.domain.booking.guestName',
    );
  });
});

describe('draftBooking', () => {
  it('переносит тип и имя, считая endMs от длительности типа', () => {
    const startMs = ms('2026-11-17T09:00:00+03:00');

    expect(draftBooking({ meetingType, guestName: 'Мария Петрова', startMs })).toEqual({
      meetingTypeId: meetingType.id,
      // Denormalized on purpose: types are never edited, so the name cannot go
      // stale.
      meetingTypeName: meetingType.name,
      guestName: 'Мария Петрова',
      startMs,
      endMs: startMs + 30 * 60_000,
    });
  });

  it.each([
    ['100 минут (конец не кратен получасовой сетке)', 100],
    ['540 минут (полный рабочий день)', 540],
  ])('endMs = startMs + длительность × 60 000: %s', (_title, durationMinutes) => {
    const startMs = ms('2026-11-17T09:00:00+03:00');

    const draft = draftBooking({
      meetingType: { ...meetingType, durationMinutes },
      guestName: 'Мария Петрова',
      startMs,
    });

    expect(draft.endMs).toBe(startMs + durationMinutes * 60_000);
  });

  it('не создаёт сущность с невалидным именем', () => {
    expect(
      captureDomainError(() =>
        draftBooking({ meetingType, guestName: ' ', startMs: ms('2026-11-17T09:00:00+03:00') }),
      ).kind,
    ).toBe('invalid_value');
  });
});
