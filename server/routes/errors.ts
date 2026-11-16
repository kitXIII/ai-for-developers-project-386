import type { ErrorCode } from '@app/api/types';
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { DomainError, type DomainErrorKind } from '../models/errors.js';

// Unified API error: thrown by the adapter (JSON envelope and contract-field
// checks), serialized as `{ code, message }` by the handler below.
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

// The only place that knows HTTP statuses for domain errors (ADR 0004). The
// `Record` is total: a new kind fails to compile until it gets a mapping.
const errorMap: Record<DomainErrorKind, { status: number; code: ErrorCode }> = {
  not_found: { status: 404, code: 'meeting_type_not_found' },
  invalid_value: { status: 400, code: 'validation_failed' },
  outside_window: { status: 409, code: 'outside_window' },
  outside_schedule: { status: 409, code: 'outside_schedule' },
  slot_taken: { status: 409, code: 'slot_taken' },
};

// Contract errors answer with the unified `{ code, message }` body; anything
// else is a bug and stays a plain 500.
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ApiError) {
      return reply.code(error.statusCode).send({ code: error.code, message: error.message });
    }
    if (error instanceof DomainError) {
      const { status, code } = errorMap[error.kind];
      return reply.code(status).send({ code, message: error.message });
    }
    if (error.statusCode === 400) {
      // Malformed JSON bodies and other parse failures keep the unified shape too.
      return reply.code(400).send({ code: 'validation_failed', message: error.message });
    }
    app.log.error(error);
    return reply.code(500).send({ message: 'Internal Server Error' });
  });
}
