import type { Messages } from '@app/api/types';

// The contract decides the shape of the catalog (ADR 0007). The SPA cannot
// import the server's `MessagePath`, so the leaf-path rule is repeated here and
// shared by the translator and the error-key mapper.
type Leaves<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`;
}[keyof T & string];

export type MessagePath = Leaves<Messages>;

type MessageParams = Record<string, string | number>;

export type Translate = (key: MessagePath, params?: MessageParams) => string;
