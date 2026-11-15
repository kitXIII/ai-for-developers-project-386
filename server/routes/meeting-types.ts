import type { AdminMeetingType, GuestMeetingType } from '@app/api/types';
import type { FastifyInstance } from 'fastify';
import { ApiError } from '../errors.js';
import type { Storage } from '../storage.js';

type MeetingTypeRoutesOptions = {
  storage: Storage;
};

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
  { storage }: MeetingTypeRoutesOptions,
): Promise<void> {
  app.get('/api/v1/meeting-types', async () => storage.meetingTypes.list().map(toGuestView));

  app.get('/api/v1/meeting-types/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const meetingType = storage.meetingTypes.getById(id);
    if (!meetingType) {
      throw new ApiError(404, 'meeting_type_not_found', 'Тип встречи не найден.');
    }
    return reply.send(toGuestView(meetingType));
  });
}
