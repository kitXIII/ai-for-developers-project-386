import type { ErrorCode } from '@app/api/types';
import { zErrorCode } from '@app/api/zod';
import type { MessagePath } from './message-path.js';

// React Query rejects with the contract envelope `{ code, message }` (the SDK
// throws the parsed body). The code decides the meaning and the catalog decides
// the text: the SPA shows `t(apiErrorKey(error))` and never the server wording.
export function errorCodeOf(error: unknown): ErrorCode | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }
  const parsed = zErrorCode.safeParse(error.code);
  return parsed.success ? parsed.data : null;
}

// Every contract code has an `errors.api` phrase — `errors.api.${ErrorCode}` is
// a subset of `MessagePath`, so a drift between contract and catalog fails tsc.
// Anything without a contract code is unexpected.
export function apiErrorKey(error: unknown): MessagePath {
  const code = errorCodeOf(error);
  return code ? `errors.api.${code}` : 'errors.unexpected';
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
