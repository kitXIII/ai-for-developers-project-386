import { DomainError } from './errors.js';

// A meeting type entity and its value invariants (ADR 0004): the repository
// owns `id`, the model owns the rest. Contract views are built by the adapter.
export type MeetingType = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
};

// The write shape of the entity: everything the owner supplies.
export type MeetingTypeData = Omit<MeetingType, 'id'>;

// A short text field: 1–100 characters, not all spaces, no edge spaces. The
// contract model uses the same rule for `name` and `guestName`.
const shortTextPattern = /^\S(?:.*\S)?$/;

// The message names the default schedule on purpose (ADR 0004): the copy is a
// literal at the throw site until the schedule becomes configurable.
function parseName(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length < 1 ||
    value.length > 100 ||
    !shortTextPattern.test(value)
  ) {
    throw new DomainError(
      'invalid_value',
      'Название обязательно: от 1 до 100 символов, без пробелов по краям.',
    );
  }
  return value;
}

function parseDescription(value: unknown): string {
  if (typeof value !== 'string' || value.length > 1000) {
    throw new DomainError('invalid_value', 'Описание обязательно: до 1000 символов.');
  }
  return value;
}

function parseDurationMinutes(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 5 || value > 540) {
    throw new DomainError('invalid_value', 'Длительность — целое число минут от 5 до 540.');
  }
  return value;
}

// Smart constructor for the value part of a meeting type. The caller checks the
// JSON envelope first (HTTP concern); this checks the fields in the frozen
// order name → description → durationMinutes.
export function parseMeetingTypeData(fields: Record<string, unknown>): MeetingTypeData {
  const name = parseName(fields.name);
  const description = parseDescription(fields.description);
  const durationMinutes = parseDurationMinutes(fields.durationMinutes);
  return { name, description, durationMinutes };
}
