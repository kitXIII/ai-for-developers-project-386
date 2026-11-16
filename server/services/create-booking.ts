// PROTOTYPE (тикет #19): сценарий «гость бронирует слот» — единственное место,
// где складываются правила домена и хранилище. HTTP здесь нет.
import type { MeetingTypeRepository } from '../repositories/meeting-types.js';
import type { BookingRepository } from '../repositories/bookings.js';
import type { Schedule } from '../models/schedule.js';
import type { Booking } from '../models/booking.js';
import { draftBooking } from '../models/booking.js';
import { DomainError } from '../models/errors.js';
import { assertSlotBookable } from '../models/slots.js';

export type CreateBookingDeps = {
  meetingTypes: MeetingTypeRepository;
  bookings: BookingRepository;
  schedule: Schedule;
  // Часы инжектируются: epoch-ms, как и весь домен.
  now: () => number;
};

export type CreateBookingInput = {
  meetingTypeId: string;
  startMs: number;
  guestName: string;
};

export async function createBooking(
  { meetingTypes, bookings, schedule, now }: CreateBookingDeps,
  { meetingTypeId, startMs, guestName }: CreateBookingInput,
): Promise<Booking> {
  const meetingType = await meetingTypes.findById(meetingTypeId);
  if (!meetingType) {
    throw new DomainError('not_found', 'Тип встречи не найден.');
  }

  // Черновик строится до проверки слота: инварианты имени не должны зависеть
  // от занятости календаря.
  const draft = draftBooking({ guestName, meetingType, startMs });

  assertSlotBookable(
    {
      nowMs: now(),
      durationMinutes: meetingType.durationMinutes,
      busy: (await bookings.list()).map(({ startMs: start, endMs: end }) => ({
        startMs: start,
        endMs: end,
      })),
      schedule,
    },
    startMs,
  );

  return bookings.create(draft);
}
