import type { MessagePath } from './message-key.js';

// Domain errors carry a kind and a catalog key with placeholders, never an HTTP
// status or a finished phrase (ADR 0004, revised by ADR 0007). The single
// kind → status/code mapping and the key → text resolution live in the HTTP
// adapter (`server/routes/errors.ts`).
export type DomainErrorKind =
  | 'not_found'
  | 'invalid_value'
  | 'outside_window'
  | 'outside_schedule'
  | 'slot_taken';

// Values for the `{name}` placeholders of a message, filled by `t()`.
export type MessageParams = Record<string, string | number>;

export class DomainError extends Error {
  constructor(
    readonly kind: DomainErrorKind,
    readonly key: MessagePath,
    readonly params: MessageParams = {},
  ) {
    // The key stands in for the text: logs stay meaningful without the catalog.
    super(key);
  }
}
