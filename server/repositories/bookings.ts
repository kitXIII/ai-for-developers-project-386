import type { Booking, BookingData } from '../models/booking.js';

// The booking port (ADR 0004): async from the start, so the Postgres adapter
// satisfies it without touching the scenarios. There is no `findById`, `update`
// or `clear`: nothing reads a single booking and editing is out of scope; each
// app gets its own storage, which is what isolates test runs (ADR 0011).
export type BookingRepository = {
  create: (data: BookingData) => Promise<Booking>;
  // Insertion order, a copy of the array: ordering and filtering are the
  // scenario's concern.
  list: () => Promise<Booking[]>;
};
