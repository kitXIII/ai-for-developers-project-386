import { randomUUID } from 'node:crypto';
import type { Booking } from '@app/api/types';

// Transitional booking storage (ADR 0004, step 2): meeting types already live
// in their repository, slots leave this module in step 3. Created inside
// `buildApp()`, never as a module singleton, so test runs stay isolated.
export type BookingStore = {
  // Bookings of every meeting type: slot availability is checked against all
  // of them (ADR 0002), and the owner's list (#15) shows them all.
  list: () => Booking[];
  create: (data: Omit<Booking, 'id'>) => Booking;
};

export type Storage = {
  bookings: BookingStore;
};

export function createStorage(): Storage {
  const bookings = new Map<string, Booking>();

  return {
    bookings: {
      create: (data) => {
        const booking: Booking = { id: randomUUID(), ...data };
        bookings.set(booking.id, booking);
        return booking;
      },
      // Sorted by `start` asc: the owner sees the nearest booking first
      // (user story 9), whatever the insertion order was.
      list: () => [...bookings.values()].sort((a, b) => Date.parse(a.start) - Date.parse(b.start)),
    },
  };
}

// Options every route module receives from `buildApp()`: the per-app storage
// and the injected clock (ADR 0002) — the routes differ only in which parts
// they use, so the bundle is declared once.
export type RouteOptions = {
  storage: Storage;
  // Injected clock (ADR 0002): «сегодня» and «предстоящие брони» are judged
  // against it, not a direct clock read in the domain logic.
  now: () => string;
};
