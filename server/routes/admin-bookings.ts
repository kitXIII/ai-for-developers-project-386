import type { Booking } from '@app/api/types';
import type { FastifyInstance } from 'fastify';
import type { Storage } from '../storage.js';

type AdminBookingsRoutesOptions = {
  storage: Storage;
  // Injected clock (ADR 0002): «предстоящие брони» are judged against it, not a
  // direct clock read in the domain logic, so tests freeze «сейчас».
  now: () => string;
};

// A booking stays on the owner's list until it is over: an `end` in the future
// keeps the booking in progress visible too.
function isUpcoming(booking: Booking, nowMs: number): boolean {
  return Date.parse(booking.end) > nowMs;
}

export async function adminBookingRoutes(
  app: FastifyInstance,
  { storage, now }: AdminBookingsRoutesOptions,
): Promise<void> {
  app.get('/api/v1/admin/bookings', async () => {
    const nowMs = Date.parse(now());
    // The storage answers sorted by `start` asc; filtering keeps that order.
    return storage.bookings.list().filter((booking) => isUpcoming(booking, nowMs));
  });
}
