import type { Messages } from '@app/api/types';

// The leaf paths of the message catalog: `common.appName`, `errors.api.validation_failed`
// and so on. Recursion stops at strings, so a key can never point at a subtree.
// The type lives in models because domain errors will carry keys (ADR 0007),
// while the catalog values live in `server/shared`.
type Leaves<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`;
}[keyof T & string];

export type MessagePath = Leaves<Messages>;
