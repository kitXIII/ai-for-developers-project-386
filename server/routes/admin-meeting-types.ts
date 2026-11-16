import type { FastifyInstance } from 'fastify';
import type { MeetingType } from '../models/meeting-type.js';
import { isRecord } from '../validation.js';
import { ApiError } from './errors.js';

// Scenarios arrive bound to their dependencies from `buildApp()`: the adapter
// checks only the JSON envelope and its own contract fields.
type AdminMeetingTypeRoutesOptions = {
  createMeetingType: (fields: Record<string, unknown>) => Promise<MeetingType>;
  listMeetingTypes: () => Promise<MeetingType[]>;
  getMeetingType: (id: string) => Promise<MeetingType>;
};

// Request bodies arrive as `unknown`: the envelope is an HTTP concern, the
// field invariants live in `parseMeetingTypeData` (ADR 0004).
function parseJsonObject(body: unknown): Record<string, unknown> {
  if (!isRecord(body)) {
    throw new ApiError(400, 'validation_failed', 'Тело запроса должно быть JSON-объектом.');
  }
  return body;
}

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
