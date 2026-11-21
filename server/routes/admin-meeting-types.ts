import type { FastifyInstance } from 'fastify';
import type { MeetingType } from '../models/meeting-type.js';
import { parseJsonObject } from './body.js';

// Scenarios arrive bound to their dependencies from the composition root: the
// adapter checks only the JSON envelope and its own contract fields.
type AdminMeetingTypeRoutesOptions = {
  meetingTypes: {
    create: (fields: Record<string, unknown>) => Promise<MeetingType>;
    list: () => Promise<MeetingType[]>;
    get: (id: string) => Promise<MeetingType>;
  };
};

export async function adminMeetingTypeRoutes(
  app: FastifyInstance,
  { meetingTypes }: AdminMeetingTypeRoutesOptions,
): Promise<void> {
  app.post('/api/v1/admin/meeting-types', async (request, reply) => {
    const meetingType = await meetingTypes.create(parseJsonObject(request.body));
    return reply.code(201).send(meetingType);
  });

  app.get('/api/v1/admin/meeting-types', async () => meetingTypes.list());

  app.get('/api/v1/admin/meeting-types/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(await meetingTypes.get(id));
  });
}
