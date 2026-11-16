import type { CreateMeetingTypeRequest } from '@app/api/types';
import type { FastifyInstance } from 'fastify';
import { ApiError } from '../errors.js';
import type { Storage } from '../storage.js';
import { isRecord, validateShortText } from '../validation.js';

type AdminMeetingTypeRoutesOptions = {
  storage: Storage;
};

// Contract model `CreateMeetingTypeRequest`: `name` — 1–100 characters, no edge
// spaces; `description` — required, 0–1000; `durationMinutes` — integer 5–540.
function validateCreateMeetingTypeRequest(body: unknown): CreateMeetingTypeRequest {
  if (!isRecord(body)) {
    throw new ApiError(400, 'validation_failed', 'Тело запроса должно быть JSON-объектом.');
  }

  const name = validateShortText(
    body.name,
    'Название обязательно: от 1 до 100 символов, без пробелов по краям.',
  );
  const { description, durationMinutes } = body;
  if (typeof description !== 'string' || description.length > 1000) {
    throw new ApiError(400, 'validation_failed', 'Описание обязательно: до 1000 символов.');
  }
  if (
    typeof durationMinutes !== 'number' ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 5 ||
    durationMinutes > 540
  ) {
    throw new ApiError(400, 'validation_failed', 'Длительность — целое число минут от 5 до 540.');
  }
  return { name, description, durationMinutes };
}

export async function adminMeetingTypeRoutes(
  app: FastifyInstance,
  { storage }: AdminMeetingTypeRoutesOptions,
): Promise<void> {
  app.post('/api/v1/admin/meeting-types', async (request, reply) => {
    const data = validateCreateMeetingTypeRequest(request.body);
    return reply.code(201).send(storage.meetingTypes.create(data));
  });

  app.get('/api/v1/admin/meeting-types', async () => storage.meetingTypes.list());

  app.get('/api/v1/admin/meeting-types/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(storage.meetingTypes.getByIdOrThrow(id));
  });
}
