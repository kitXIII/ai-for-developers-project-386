import type { FastifyInstance } from 'fastify';
import type { MeetingType } from '../models/meeting-type.js';
import { parseJsonObject } from './body.js';

// Scenarios arrive bound to their dependencies from `buildApp()`: the adapter
// checks only the JSON envelope and its own contract fields.
type AdminMeetingTypeRoutesOptions = {
  createMeetingType: (fields: Record<string, unknown>) => Promise<MeetingType>;
  listMeetingTypes: () => Promise<MeetingType[]>;
  getMeetingType: (id: string) => Promise<MeetingType>;
};

export async function adminMeetingTypeRoutes(
  app: FastifyInstance,
  { createMeetingType, listMeetingTypes, getMeetingType }: AdminMeetingTypeRoutesOptions,
): Promise<void> {
  app.post('/api/v1/admin/meeting-types', async (request, reply) => {
    const meetingType = await createMeetingType(parseJsonObject(request.body));
    return reply.code(201).send(meetingType);
  });

  app.get('/api/v1/admin/meeting-types', async () => listMeetingTypes());

  app.get('/api/v1/admin/meeting-types/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(await getMeetingType(id));
  });
}
