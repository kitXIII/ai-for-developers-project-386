import type { ErrorCode } from '@app/api/types';

// Unified API error: thrown by handlers, serialized as `{ code, message }`
// by the error handler in `app.ts` (contract model `ApiError`).
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}
