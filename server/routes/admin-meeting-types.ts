import type { CreateMeetingTypeRequest } from '@app/api/types';
import type { FastifyInstance } from 'fastify';
import { ApiError } from '../errors.js';
import type { Storage } from '../storage.js';

type AdminMeetingTypeRoutesOptions = {
  storage: Storage;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Contract model `CreateMeetingTypeRequest`: `name` — 1–100 characters, no edge
// spaces; `description` — required, 0–1000; `durationMinutes` — integer 5–540.
const namePattern = /^\S(?:.*\S)?$/;

function validateCreateMeetingTypeRequest(body: unknown): CreateMeetingTypeRequest {
  if (!isRecord(body)) {
    throw new ApiError(400, 'validation_failed', 'Тело запроса должно быть JSON-объектом.');
  }

  const { name, description, durationMinutes } = body;
  if (typeof name !== 'string' || name.length < 1 || name.length > 100 || !namePattern.test(name)) {
    throw new ApiError(
      400,
      'validation_failed',
      'Название обязательно: от 1 до 100 символов, без пробелов по краям.',
    );
  }
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
    const meetingType = storage.meetingTypes.getById(id);
    if (!meetingType) {
      throw new ApiError(404, 'meeting_type_not_found', 'Тип встречи не найден.');
    }
    return reply.send(meetingType);
  });
}
