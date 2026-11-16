// PROTOTYPE (тикет #19): сущность «Бронирование». Время — epoch-ms;
// момент в формате контракта собирает адаптер.
import { DomainError } from './errors.js';

export type Booking = {
  id: string;
  meetingTypeId: string;
  meetingTypeName: string;
  guestName: string;
  startMs: number;
  endMs: number;
};

const shortText = /^\S(?:.*\S)?$/;

function assertValidGuestName(guestName: unknown): asserts guestName is string {
  if (
    typeof guestName !== 'string' ||
    guestName.length < 1 ||
    guestName.length > 100 ||
    !shortText.test(guestName)
  ) {
    throw new DomainError(
      'invalid_value',
      'Имя обязательно: от 1 до 100 символов, без пробелов по краям.',
    );
  }
}

export type BookingDraft = {
  guestName: string;
  meetingType: { id: string; name: string; durationMinutes: number };
  startMs: number;
};

// Конец брони считает домен по длительности типа, а не клиент.
export function draftBooking({
  guestName,
  meetingType,
  startMs,
}: BookingDraft): Omit<Booking, 'id'> {
  assertValidGuestName(guestName);
  return {
    meetingTypeId: meetingType.id,
    meetingTypeName: meetingType.name,
    guestName,
    startMs,
    endMs: startMs + meetingType.durationMinutes * 60_000,
  };
}
