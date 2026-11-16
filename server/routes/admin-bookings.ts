import type { Booking as BookingResponse } from '@app/api/types';
import type { FastifyInstance } from 'fastify';
import type { Booking } from '../models/booking.js';
import type { Schedule } from '../models/schedule.js';
import { formatMoment } from '../shared/moment.js';

// The contract shape is assembled here, in the only layer that knows the
// `+03:00` moment format (ADR 0004).
function toContractBooking(
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

type AdminBookingRoutesOptions = {
  listUpcomingBookings: () => Promise<Booking[]>;
  schedule: Schedule;
};

export async function adminBookingRoutes(
  app: FastifyInstance,
  { listUpcomingBookings, schedule }: AdminBookingRoutesOptions,
): Promise<void> {
  app.get('/api/v1/admin/bookings', async () =>
    (await listUpcomingBookings()).map((booking) => toContractBooking(booking, schedule)),
  );
}
