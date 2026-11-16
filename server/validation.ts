import { ApiError } from './routes/errors.js';

// Request bodies arrive as `unknown`: the route validates the JSON envelope
// before trusting the contract types.
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// The two «short text» fields of the contract models — `name` of
// `CreateMeetingTypeRequest` and `guestName` of `CreateBookingRequest` — share
// the same rules: 1–100 characters, not all spaces, no edge spaces.
const namePattern = /^\S(?:.*\S)?$/;

// Validates a short-text field and returns it as a string; otherwise throws
// the contract 400 `validation_failed` with the field's own message.
export function validateShortText(value: unknown, message: string): string {
  if (
    typeof value !== 'string' ||
    value.length < 1 ||
    value.length > 100 ||
    !namePattern.test(value)
  ) {
    throw new ApiError(400, 'validation_failed', message);
  }
  return value;
}
