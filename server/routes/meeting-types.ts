import type { GuestMeetingType } from '@app/api/types';
import type { FastifyInstance } from 'fastify';
import type { Booking } from '../models/booking.js';
import type { MeetingType } from '../models/meeting-type.js';
import { generateAvailableSlots } from '../slots.js';

// ADR 0003: guest and owner views are separate contract models, so the guest
// shape is built explicitly from the stored entity even while fields coincide.
function toGuestView({ id, name, description, durationMinutes }: MeetingType): GuestMeetingType {
  return { id, name, description, durationMinutes };
}

// Scenarios arrive bound to their dependencies from `buildApp()`: the adapter
// never sees the repository.
type MeetingTypeRoutesOptions = {
  listMeetingTypes: () => Promise<MeetingType[]>;
  getMeetingType: (id: string) => Promise<MeetingType>;
  // Bound to the booking repository by `buildApp()` until the slot calendar
  // moves to its own scenario (ADR 0004, step 3).
  listBookings: () => Promise<Booking[]>;
  now: () => number;
};

export async function meetingTypeRoutes(
  app: FastifyInstance,
  { listMeetingTypes, getMeetingType, listBookings, now }: MeetingTypeRoutesOptions,
): Promise<void> {
  app.get('/api/v1/meeting-types', async () => (await listMeetingTypes()).map(toGuestView));

  app.get('/api/v1/meeting-types/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(toGuestView(await getMeetingType(id)));
  });

  // The whole booking window comes back in one response; days without free
  // slots are omitted (the client disables them in the calendar). The old
  // generator takes ISO moments, so the adapter converts them back until step 3.
  app.get('/api/v1/meeting-types/:id/slots', async (request, reply) => {
    const { id } = request.params as { id: string };
    const meetingType = await getMeetingType(id);
    const nowMs = now();
    const busy = (await listBookings()).map(({ startMs, endMs }) => ({
      start: new Date(startMs).toISOString(),
      end: new Date(endMs).toISOString(),
    }));
    return reply.send(
      generateAvailableSlots({
        now: new Date(nowMs).toISOString(),
        durationMinutes: meetingType.durationMinutes,
        bookings: busy,
      }),
    );
  });
}
