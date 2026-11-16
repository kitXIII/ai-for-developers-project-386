import { DomainError } from './errors.js';
import type { MeetingType } from './meeting-type.js';
import { isShortText } from './text.js';

// The booking entity (ADR 0004): everything is epoch-ms here, the repository
// owns `id`, the contract moments are built by the adapter.
export type Booking = {
  id: string;
  meetingTypeId: string;
  // Denormalized on purpose: types are never edited, so the name cannot go stale.
  meetingTypeName: string;
  guestName: string;
  startMs: number;
  endMs: number;
};

// The write shape of the entity: everything the guest supplies plus the values
// the model derives.
export type BookingData = Omit<Booking, 'id'>;

// The rule is shared with the meeting type `name`; the message names the field
// and stays here.
export function parseGuestName(value: unknown): string {
  if (!isShortText(value)) {
    throw new DomainError(
      'invalid_value',
      'Имя обязательно: от 1 до 100 символов, без пробелов по краям.',
    );
  }
  return value;
}

// Smart constructor for a booking draft: the duration comes from the meeting
// type, and the model computes `endMs` itself, so a client-supplied end never
// reaches the storage (spec #10).
export function draftBooking({
  meetingType,
  guestName,
  startMs,
}: {
  meetingType: MeetingType;
  guestName: unknown;
  startMs: number;
}): BookingData {
  return {
    meetingTypeId: meetingType.id,
    meetingTypeName: meetingType.name,
    guestName: parseGuestName(guestName),
    startMs,
    endMs: startMs + meetingType.durationMinutes * 60_000,
  };
}
