import { randomUUID } from 'node:crypto';
import type { Booking, BookingData } from '../models/booking.js';

// The booking port (ADR 0004): async from the start, so a database adapter can
// replace this one without touching the scenarios. There is no `findById`,
// `update` or `clear`: nothing reads a single booking and editing is out of
// scope; an app gets a fresh adapter, which is what isolates test runs.
export type BookingRepository = {
  create: (data: BookingData) => Promise<Booking>;
  // Insertion order, a copy of the array: ordering and filtering are the
  // scenario's concern.
  list: () => Promise<Booking[]>;
};

// In-memory adapter: one instance per app, never a module singleton. `id` is
// generated here — a database adapter uses its schema instead.
export function inMemoryBookings(): BookingRepository {
  const bookings = new Map<string, Booking>();

  return {
    create: async (data) => {
      const booking: Booking = { id: randomUUID(), ...data };
      bookings.set(booking.id, booking);
      return booking;
    },
    list: async () => [...bookings.values()],
  };
}
