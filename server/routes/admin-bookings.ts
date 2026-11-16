import type { Booking } from '@app/api/types';
import type { FastifyInstance } from 'fastify';
import type { RouteOptions } from '../storage.js';

// A booking stays on the owner's list until it is over: an `end` in the future
// keeps the booking in progress visible too.
function isUpcoming(booking: Booking, nowMs: number): boolean {
  return Date.parse(booking.end) > nowMs;
}

export async function adminBookingRoutes(
  app: FastifyInstance,
  { storage, now }: RouteOptions,
): Promise<void> {
  app.get('/api/v1/admin/bookings', async () => {
    const nowMs = Date.parse(now());
    // The storage answers sorted by `start` asc; filtering keeps that order.
    return storage.bookings.list().filter((booking) => isUpcoming(booking, nowMs));
  });
}
