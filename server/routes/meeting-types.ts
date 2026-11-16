import type { AdminMeetingType, GuestMeetingType } from '@app/api/types';
import type { FastifyInstance } from 'fastify';
import { generateAvailableSlots } from '../slots.js';
import type { RouteOptions } from '../storage.js';

// ADR 0003: guest and owner views are separate contract models, so the guest
// shape is built explicitly from the stored entity even while fields coincide.
function toGuestView({
  id,
  name,
  description,
  durationMinutes,
}: AdminMeetingType): GuestMeetingType {
  return { id, name, description, durationMinutes };
}

export async function meetingTypeRoutes(
  app: FastifyInstance,
  { storage, now }: RouteOptions,
): Promise<void> {
  app.get('/api/v1/meeting-types', async () => storage.meetingTypes.list().map(toGuestView));

  app.get('/api/v1/meeting-types/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(toGuestView(storage.meetingTypes.getByIdOrThrow(id)));
  });

  // The whole booking window comes back in one response; days without free
  // slots are omitted (the client disables them in the calendar).
  app.get('/api/v1/meeting-types/:id/slots', async (request, reply) => {
    const { id } = request.params as { id: string };
    const meetingType = storage.meetingTypes.getByIdOrThrow(id);
    return reply.send(
      generateAvailableSlots({
        now: now(),
        durationMinutes: meetingType.durationMinutes,
        bookings: storage.bookings.list(),
      }),
    );
  });
}
