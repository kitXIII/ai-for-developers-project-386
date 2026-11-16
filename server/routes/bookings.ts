import type { Booking, CreateBookingRequest } from '@app/api/types';
import type { FastifyInstance } from 'fastify';
import { ApiError } from '../errors.js';
import { formatUtc3Moment, validateSlotIsBookable } from '../slots.js';
import type { RouteOptions } from '../storage.js';
import { isRecord, validateShortText } from '../validation.js';

// Contract model `CreateBookingRequest`: `guestName` — 1–100 characters, no
// edge spaces (same rules as the meeting type name); `start` — offsetDateTime.
const momentWithOffset =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

function validateCreateBookingRequest(body: unknown): CreateBookingRequest {
  if (!isRecord(body)) {
    throw new ApiError(400, 'validation_failed', 'Тело запроса должно быть JSON-объектом.');
  }

  const { meetingTypeId, start } = body;
  if (typeof meetingTypeId !== 'string' || meetingTypeId.length === 0) {
    throw new ApiError(400, 'validation_failed', 'Укажите тип встречи.');
  }
  if (
    typeof start !== 'string' ||
    !momentWithOffset.test(start) ||
    Number.isNaN(Date.parse(start))
  ) {
    throw new ApiError(
      400,
      'validation_failed',
      'Время начала — ISO-момент со смещением, например 2026-12-01T10:00:00+03:00.',
    );
  }
  const guestName = validateShortText(
    body.guestName,
    'Имя обязательно: от 1 до 100 символов, без пробелов по краям.',
  );
  return { meetingTypeId, start, guestName };
}

export async function bookingRoutes(
  app: FastifyInstance,
  { storage, now }: RouteOptions,
): Promise<void> {
  app.post('/api/v1/bookings', async (request, reply) => {
    const { meetingTypeId, start, guestName } = validateCreateBookingRequest(request.body);

    const meetingType = storage.meetingTypes.getByIdOrThrow(meetingTypeId);

    const startMs = Date.parse(start);
    // The server computes `end` itself from the type duration (spec #10).
    const endMs = startMs + meetingType.durationMinutes * 60_000;

    // Checking and writing are one synchronous section without awaits: Node
    // runs handlers on a single thread, so no second booking can slip in
    // between the overlap check and the write (spec #10).
    validateSlotIsBookable({
      now: now(),
      durationMinutes: meetingType.durationMinutes,
      startMs,
      bookings: storage.bookings.list(),
    });
    const booking: Booking = storage.bookings.create({
      meetingTypeId: meetingType.id,
      // Denormalized on purpose: types are never edited, so the name cannot
      // go stale (spec #10).
      meetingTypeName: meetingType.name,
      guestName,
      // Moments are answered in the +03:00 frame whatever the input offset was.
      start: formatUtc3Moment(startMs),
      end: formatUtc3Moment(endMs),
    });
    return reply.code(201).send(booking);
  });
}
