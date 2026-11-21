import type { MessagesPayload } from '@app/api/types';
import type { FastifyInstance } from 'fastify';
import { messages } from '../shared/i18n/index.js';

// The catalog is static for the process lifetime, so the payload is assembled
// once here; the contract decides its shape (ADR 0007).
const payload: MessagesPayload = { locale: 'ru', messages };

export async function messagesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/messages', async () => payload);
}
