import type { Booking as BookingResponse } from '@app/api/types';
import type { FastifyInstance } from 'fastify';
import { parseGuestName, type Booking } from '../models/booking.js';
import type { Schedule } from '../models/schedule.js';
import type { CreateBookingInput } from '../services/bookings.js';
import { formatMoment } from '../shared/moment.js';
import { parseJsonObject } from './body.js';
import { ApiError } from './errors.js';

// The adapter checks its own contract fields (ADR 0004); everything else is a
// scenario. `CreateBookingRequest.start` is an offsetDateTime.
const momentWithOffset =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

const invalidStartMessage =
  'Время начала — ISO-момент со смещением, например 2026-12-01T10:00:00+03:00.';

function parseStartMs(value: unknown): number {
  if (typeof value !== 'string' || !momentWithOffset.test(value)) {
    throw new ApiError(400, 'validation_failed', invalidStartMessage);
  }
  const startMs = Date.parse(value);
  if (Number.isNaN(startMs)) {
    throw new ApiError(400, 'validation_failed', invalidStartMessage);
  }
  return startMs;
}

// The contract shape is assembled here, in the only layer that knows the
// `+03:00` moment format (ADR 0004). The admin route imports the same function:
// two adapters of one entity do not duplicate the mapping.
export function toContractBooking(
  { id, meetingTypeId, meetingTypeName, guestName, startMs, endMs }: Booking,
  schedule: Schedule,
): BookingResponse {
  return {
    id,
    meetingTypeId,
    meetingTypeName,
    guestName,
    start: formatMoment(startMs, schedule),
    end: formatMoment(endMs, schedule),
  };
}

type BookingRoutesOptions = {
  createBooking: (input: CreateBookingInput) => Promise<Booking>;
  schedule: Schedule;
};

export async function bookingRoutes(
  app: FastifyInstance,
  { createBooking, schedule }: BookingRoutesOptions,
): Promise<void> {
  app.post('/api/v1/bookings', async (request, reply) => {
    const body = parseJsonObject(request.body);

    // The fields are checked in the contract's frozen order — meetingTypeId →
    // start → guestName — so a 400 on the name beats a 404 on an unknown type.
    const { meetingTypeId } = body;
    if (typeof meetingTypeId !== 'string' || meetingTypeId.length === 0) {
      throw new ApiError(400, 'validation_failed', 'Укажите тип встречи.');
    }
    const startMs = parseStartMs(body.start);
    const guestName = parseGuestName(body.guestName);

    const booking = await createBooking({ meetingTypeId, startMs, guestName });
    return reply.code(201).send(toContractBooking(booking, schedule));
  });
}
