import { inMemoryBookings } from '../../../server/repositories/bookings.js';
import { inMemoryMeetingTypes } from '../../../server/repositories/meeting-types.js';
import { describeRepositoryContract } from './suite.js';

// The port contract on the default adapter (ADR 0004): a fresh pair per test,
// no mocks — writes are observed through `list()`.
describeRepositoryContract('in-memory адаптеры', {
  create: () => ({
    meetingTypes: inMemoryMeetingTypes(),
    bookings: inMemoryBookings(),
  }),
});
