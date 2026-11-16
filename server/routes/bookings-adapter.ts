// PROTOTYPE (тикет #19): HTTP-адаптер. Здесь и только здесь живут статусы,
// контрактные коды, JSON-конверт и формат моментов.
import type { FastifyInstance } from 'fastify';
import type { ErrorCode } from '@app/api/types';
import { DomainError, type DomainErrorKind } from '../models/errors.js';
import type { Schedule } from '../models/schedule.js';
import { createBooking, type CreateBookingDeps } from '../services/create-booking.js';
import { formatMoment } from '../shared/moment.js';

const errorMap: Record<DomainErrorKind, { statusCode: number; code: ErrorCode }> = {
  not_found: { statusCode: 404, code: 'meeting_type_not_found' },
  invalid_value: { statusCode: 400, code: 'validation_failed' },
  outside_window: { statusCode: 409, code: 'outside_window' },
  outside_schedule: { statusCode: 409, code: 'outside_schedule' },
  slot_taken: { statusCode: 409, code: 'slot_taken' },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Проверка конверта: адаптер отвечает за «это JSON-объект с нужными полями»,
// инварианты значений проверяет модель.
function readBookingRequest(body: unknown): {
  meetingTypeId: string;
  startMs: number;
  guestName: string;
} {
  if (!isRecord(body)) {
    throw new DomainError('invalid_value', 'Тело запроса должно быть JSON-объектом.');
  }
  const { meetingTypeId, start, guestName } = body;
  if (typeof meetingTypeId !== 'string' || meetingTypeId.length === 0) {
    throw new DomainError('invalid_value', 'Укажите тип встречи.');
  }
  if (typeof start !== 'string' || Number.isNaN(Date.parse(start))) {
    throw new DomainError(
      'invalid_value',
      'Время начала — ISO-момент со смещением, например 2026-12-01T10:00:00+03:00.',
    );
  }
  if (typeof guestName !== 'string') {
    throw new DomainError('invalid_value', 'Имя обязательно.');
  }
  return { meetingTypeId, startMs: Date.parse(start), guestName };
}

export type BookingRouteDeps = CreateBookingDeps & { schedule: Schedule };

export function createBookingRoutes(app: FastifyInstance, deps: BookingRouteDeps): void {
  app.post('/api/v1/bookings', async (request, reply) => {
    const input = readBookingRequest(request.body);
    const booking = await createBooking(deps, input);
    return reply.code(201).send({
      id: booking.id,
      meetingTypeId: booking.meetingTypeId,
      meetingTypeName: booking.meetingTypeName,
      guestName: booking.guestName,
      start: formatMoment(booking.startMs, deps.schedule),
      end: formatMoment(booking.endMs, deps.schedule),
    });
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof DomainError) {
      const { statusCode, code } = errorMap[error.kind];
      return reply.code(statusCode).send({ code, message: error.message });
    }
    app.log.error(error);
    return reply.code(500).send({ message: 'Internal Server Error' });
  });
}
