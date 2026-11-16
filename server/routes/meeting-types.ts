import type { GuestMeetingType } from '@app/api/types';
import type { FastifyInstance } from 'fastify';
import type { MeetingType } from '../models/meeting-type.js';
import { generateAvailableSlots } from '../slots.js';
import type { BookingStore } from '../storage.js';

// ADR 0003: guest and owner views are separate contract models, so the guest
// shape is built explicitly from the stored entity even while fields coincide.
function toGuestView({ id, name, description, durationMinutes }: MeetingType): GuestMeetingType {
  return { id, name, description, durationMinutes };
}

// Scenarios arrive bound to their dependencies from `buildApp()`: the adapter
// never sees the repository. Until the slot calendar moves to its own layer,
// the bridge takes bookings from the old storage (ADR 0004, step 3).
type MeetingTypeRoutesOptions = {
  listMeetingTypes: () => Promise<MeetingType[]>;
  getMeetingType: (id: string) => Promise<MeetingType>;
  bookings: BookingStore;
  now: () => string;
};

export async function meetingTypeRoutes(
  app: FastifyInstance,
  { listMeetingTypes, getMeetingType, bookings, now }: MeetingTypeRoutesOptions,
): Promise<void> {
  app.get('/api/v1/meeting-types', async () => (await listMeetingTypes()).map(toGuestView));

  app.get('/api/v1/meeting-types/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(toGuestView(await getMeetingType(id)));
  });

  // The whole booking window comes back in one response; days without free
  // slots are omitted (the client disables them in the calendar).
  app.get('/api/v1/meeting-types/:id/slots', async (request, reply) => {
    const { id } = request.params as { id: string };
    const meetingType = await getMeetingType(id);
    return reply.send(
      generateAvailableSlots({
        now: now(),
        durationMinutes: meetingType.durationMinutes,
        bookings: bookings.list(),
      }),
    );
  });
}
