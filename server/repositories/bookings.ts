// PROTOTYPE (тикет #19): порт хранилища броней. Хранилище ничего не сортирует
// и ни о чём не судит — порядок и фильтры принадлежат сценарию.
import { randomUUID } from 'node:crypto';
import type { Booking } from '../models/booking.js';

export type BookingRepository = {
  create: (data: Omit<Booking, 'id'>) => Promise<Booking>;
  list: () => Promise<Booking[]>;
};

export function inMemoryBookings(): BookingRepository {
  const items = new Map<string, Booking>();

  return {
    create: async (data) => {
      const booking: Booking = { id: randomUUID(), ...data };
      items.set(booking.id, booking);
      return booking;
    },
    list: async () => [...items.values()],
  };
}
