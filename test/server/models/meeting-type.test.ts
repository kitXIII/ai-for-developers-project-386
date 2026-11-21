import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../server/models/errors.js';
import { parseMeetingTypeData } from '../../../server/models/meeting-type.js';

// The model owns the value invariants of a meeting type (ADR 0004). Wording is
// not pinned: the matrix checks the error kind, and the key is checked once per
// field — the catalog decides the phrase (ADR 0007).
const validMeetingTypeData = {
  name: 'Знакомство',
  description: 'Короткий видеозвонок для знакомства',
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

describe('parseMeetingTypeData', () => {
  it('принимает значение по правилам и отбрасывает лишние поля запроса', () => {
    expect(parseMeetingTypeData({ ...validMeetingTypeData, extra: 'ignored' })).toEqual(
      validMeetingTypeData,
    );
  });

  it('допускает пустое описание', () => {
    expect(parseMeetingTypeData({ ...validMeetingTypeData, description: '' })).toEqual({
      ...validMeetingTypeData,
      description: '',
    });
  });

  it.each([
    ['имя отсутствует', { ...validMeetingTypeData, name: undefined }],
    ['имя — не строка', { ...validMeetingTypeData, name: 42 }],
    ['имя пустое', { ...validMeetingTypeData, name: '' }],
    ['имя из одних пробелов', { ...validMeetingTypeData, name: '   ' }],
    ['имя с пробелом в начале', { ...validMeetingTypeData, name: ' Знакомство' }],
    ['имя с пробелом в конце', { ...validMeetingTypeData, name: 'Знакомство ' }],
    ['имя длиннее 100 символов', { ...validMeetingTypeData, name: 'а'.repeat(101) }],
    ['описание отсутствует', { ...validMeetingTypeData, description: undefined }],
    ['описание — не строка', { ...validMeetingTypeData, description: 42 }],
    ['описание длиннее 1000 символов', { ...validMeetingTypeData, description: 'о'.repeat(1001) }],
    ['длительность меньше 5', { ...validMeetingTypeData, durationMinutes: 4 }],
    ['длительность больше 540', { ...validMeetingTypeData, durationMinutes: 541 }],
    ['длительность не целая', { ...validMeetingTypeData, durationMinutes: 30.5 }],
    ['длительность — строка', { ...validMeetingTypeData, durationMinutes: '30' }],
  ] as [string, Record<string, unknown>][])('бросает invalid_value: %s', (_title, fields) => {
    expect(captureDomainError(() => parseMeetingTypeData(fields)).kind).toBe('invalid_value');
  });

  it.each([
    ['имя', { ...validMeetingTypeData, name: '' }, 'errors.domain.meetingType.name'],
    [
      'описание',
      { ...validMeetingTypeData, description: 'о'.repeat(1001) },
      'errors.domain.meetingType.description',
    ],
    [
      'длительность',
      { ...validMeetingTypeData, durationMinutes: 4 },
      'errors.domain.meetingType.duration',
    ],
  ] as [string, Record<string, unknown>, string][])(
    'называет ключ каталога: %s',
    (_title, fields, key) => {
      expect(captureDomainError(() => parseMeetingTypeData(fields)).key).toBe(key);
    },
  );
});
