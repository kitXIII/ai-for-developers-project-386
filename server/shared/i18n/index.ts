import type { MessageParams } from '../../models/errors.js';
import type { MessagePath } from '../../models/message-key.js';
import { ru } from './ru.js';

// The served catalog. One locale for now (ADR 0007): a second one turns this
// module into a locale map, the contract stays the same.
export const messages = ru;

const placeholder = /\{(\w+)\}/g;

// Resolves a dot path and fills `{name}` placeholders. A missing key or param is
// a bug in the caller, not a user-facing condition, so it throws — tests assert
// both failures instead of letting a half-filled string reach the UI.
export function t(key: MessagePath, params: MessageParams = {}): string {
  let node: unknown = messages;
  for (const segment of key.split('.')) {
    node = (node as Record<string, unknown>)[segment];
  }
  if (typeof node !== 'string') {
    throw new Error(`Unknown message key: ${key}`);
  }
  return node.replace(placeholder, (_placeholder, name: string) => {
    const value = params[name];
    if (value === undefined) {
      throw new Error(`Missing param "${name}" for message "${key}"`);
    }
    return String(value);
  });
}
