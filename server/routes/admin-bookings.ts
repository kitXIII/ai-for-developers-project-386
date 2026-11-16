import type { FastifyInstance } from 'fastify';
import type { Booking } from '../models/booking.js';
import type { Schedule } from '../models/schedule.js';
import { toContractBooking } from './bookings.js';

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
