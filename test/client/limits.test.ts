import { describe, expect, it } from 'vitest';
import { zCreateBookingRequest, zCreateMeetingTypeRequest } from '@app/api/zod';
import {
  DESCRIPTION_MAX,
  DURATION_MAX,
  DURATION_MIN,
  SHORT_TEXT_MIN,
  SHORT_TEXT_MAX,
} from '../../client/lib/limits.js';

// The client checks forms before sending them, so the limits are repeated in
// `client/lib/limits.ts`; the contract's generated Zod schema is the source of
// truth. The probes below pin each constant to the schema's accepted bounds.
const shortText = (length: number) => 'a'.repeat(length);

function acceptsMeetingTypeName(value: string): boolean {
  return zCreateMeetingTypeRequest.safeParse({
    name: value,
    description: '',
    durationMinutes: 30,
  }).success;
}

function acceptsGuestName(value: string): boolean {
  return zCreateBookingRequest.safeParse({
    meetingTypeId: 'id',
    start: '2026-12-01T10:00:00Z',
    guestName: value,
  }).success;
}

function acceptsDescription(value: string): boolean {
  return zCreateMeetingTypeRequest.safeParse({
    name: 'Знакомство',
    description: value,
    durationMinutes: 30,
  }).success;
}

function acceptsDuration(value: number): boolean {
  return zCreateMeetingTypeRequest.safeParse({
    name: 'Знакомство',
    description: '',
    durationMinutes: value,
  }).success;
}

describe('лимиты форм', () => {
  it('короткий текст: 1–100 символов в названии типа и имени гостя', () => {
    for (const accepts of [acceptsMeetingTypeName, acceptsGuestName]) {
      expect(accepts(shortText(SHORT_TEXT_MIN))).toBe(true);
      expect(accepts(shortText(SHORT_TEXT_MAX))).toBe(true);
      expect(accepts(shortText(SHORT_TEXT_MIN - 1))).toBe(false);
      expect(accepts(shortText(SHORT_TEXT_MAX + 1))).toBe(false);
    }
  });

  it('описание: до 1000 символов', () => {
    expect(acceptsDescription(shortText(DESCRIPTION_MAX))).toBe(true);
    expect(acceptsDescription(shortText(DESCRIPTION_MAX + 1))).toBe(false);
  });

  it('длительность: целое число минут 5–540', () => {
    expect(acceptsDuration(DURATION_MIN)).toBe(true);
    expect(acceptsDuration(DURATION_MAX)).toBe(true);
    expect(acceptsDuration(DURATION_MIN - 1)).toBe(false);
    expect(acceptsDuration(DURATION_MAX + 1)).toBe(false);
    expect(acceptsDuration(DURATION_MIN + 0.5)).toBe(false);
  });
});
