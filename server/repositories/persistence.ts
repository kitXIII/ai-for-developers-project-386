import type { BookingRepository } from './bookings.js';
import type { MeetingTypeRepository } from './meeting-types.js';

// The storage bundle the composition root hands to the app (ADR 0006, 0011):
// both repository ports plus the lifecycle of the one storage they share. The
// adapters own the connection — the app only knows how to check and close it.
export type Persistence = {
  meetingTypes: MeetingTypeRepository;
  bookings: BookingRepository;
  checkConnection: () => Promise<void>;
  close: () => Promise<void>;
};
