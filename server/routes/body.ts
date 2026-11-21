import { t } from '../shared/i18n/index.js';
import { ApiError } from './errors.js';

// Request bodies arrive as `unknown`: the HTTP adapter checks the JSON envelope
// and hands the object to the model, which owns the field invariants (ADR 0004).
export function parseJsonObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ApiError(400, 'validation_failed', t('errors.http.bodyNotObject'));
  }
  return body as Record<string, unknown>;
}
