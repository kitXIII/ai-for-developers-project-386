import type { ErrorCode } from '@app/api/types';
import { zErrorCode } from '@app/api/zod';
// The `./message-path.js` extension is required: the test tsconfig compiles
// this client module under NodeNext (client code is bundled and normally
// imports without an extension).
import type { MessagePath } from './message-path.js';

type ErrorEnvelope = { code?: unknown };

function codeOf(error: unknown): unknown {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  return (error as ErrorEnvelope).code;
}

// React Query rejects with the contract envelope `{ code, message }` (the SDK
// throws the parsed body). The code decides the meaning and the catalog decides
// the text: the SPA shows `t(apiErrorKey(error))` and never the server wording.
export function errorCodeOf(error: unknown): ErrorCode | null {
  const parsed = zErrorCode.safeParse(codeOf(error));
  return parsed.success ? parsed.data : null;
}

// Every contract code has an `errors.api` phrase — `errors.api.${ErrorCode}` is
// a subset of `MessagePath`, so a drift between contract and catalog fails tsc.
// A failure without any code says nothing, so the screen passes the phrase it
// wants to show; a code present but outside the contract is a broken envelope
// and stays `errors.unexpected` instead of hiding behind that phrase.
export function apiErrorKey(
  error: unknown,
  fallback: MessagePath = 'errors.unexpected',
): MessagePath {
  const code = errorCodeOf(error);
  if (code) {
    return `errors.api.${code}`;
  }
  return codeOf(error) === undefined ? fallback : 'errors.unexpected';
}

// A missing meeting type is the final 404 (the queries set `retry: false`).
export function isMeetingTypeNotFound(error: unknown): boolean {
  return errorCodeOf(error) === 'meeting_type_not_found';
}

// 409 codes mean the picked slot is gone or unusable — the fix is another slot.
const conflictCodes: readonly ErrorCode[] = ['slot_taken', 'outside_window', 'outside_schedule'];

export function isConflictCode(code: ErrorCode): boolean {
  return conflictCodes.includes(code);
}
