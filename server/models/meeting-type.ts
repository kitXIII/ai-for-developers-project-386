import { DomainError } from './errors.js';
import { isShortText, SHORT_TEXT_MAX, SHORT_TEXT_MIN } from './text.js';

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

const DESCRIPTION_MAX = 1000;
const DURATION_MIN = 5;
const DURATION_MAX = 540;

// The rule lives in `text.ts`; the key names the field, the params quote the
// limits the predicate enforces (ADR 0007).
function parseName(value: unknown): string {
  if (!isShortText(value)) {
    throw new DomainError('invalid_value', 'errors.domain.meetingType.name', {
      min: SHORT_TEXT_MIN,
      max: SHORT_TEXT_MAX,
    });
  }
  return value;
}

function parseDescription(value: unknown): string {
  if (typeof value !== 'string' || value.length > DESCRIPTION_MAX) {
    throw new DomainError('invalid_value', 'errors.domain.meetingType.description', {
      max: DESCRIPTION_MAX,
    });
  }
  return value;
}

function parseDurationMinutes(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < DURATION_MIN ||
    value > DURATION_MAX
  ) {
    throw new DomainError('invalid_value', 'errors.domain.meetingType.duration', {
      min: DURATION_MIN,
      max: DURATION_MAX,
    });
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
