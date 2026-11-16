// Domain errors carry a kind and a message, never an HTTP status (ADR 0004).
// The single kind → status/code mapping lives in the HTTP adapter
// (`server/routes/errors.ts`).
export type DomainErrorKind =
  | 'not_found'
  | 'invalid_value'
  | 'outside_window'
  | 'outside_schedule'
  | 'slot_taken';

export class DomainError extends Error {
  constructor(
    readonly kind: DomainErrorKind,
    message: string,
  ) {
    super(message);
  }
}
