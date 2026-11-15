import { resolve } from 'node:path';
import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import FastifyVite from '@fastify/vite';
import { ApiError } from './errors.js';
import { adminMeetingTypeRoutes } from './routes/admin-meeting-types.js';
import { createStorage } from './storage.js';

type BuildAppOptions = {
  // Tests disable the client to avoid starting Vite.
  serveClient?: boolean;
  // Tests disable logging to keep the output clean.
  logger?: boolean;
};

export async function buildApp({
  serveClient = true,
  logger = true,
}: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger });

  // Per-instance in-memory storage — never a module singleton, so test runs
  // stay isolated (docs/test-plan.md).
  const storage = createStorage();

  // Contract errors answer with the unified `{ code, message }` body;
  // anything else is a bug and stays a plain 500.
  app.setErrorHandler((error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ApiError) {
      return reply.code(error.statusCode).send({ code: error.code, message: error.message });
    }
    if (error.statusCode === 400) {
      // Malformed JSON bodies and other parse failures keep the unified shape too.
      return reply.code(400).send({ code: 'validation_failed', message: error.message });
    }
    app.log.error(error);
    return reply.code(500).send({ message: 'Internal Server Error' });
  });

  await app.register(adminMeetingTypeRoutes, { storage });

  if (serveClient) {
    await app.register(FastifyVite, {
      // Running from `server/` during development and from `dist/` in production,
      // so `..` points to the project root in both cases.
      root: resolve(import.meta.dirname, '..'),
      dev: process.argv.includes('--dev'),
      spa: true,
    });

    app.get('/', (_request, reply) => reply.html());
  }

  // SPA fallback: any non-API GET request renders the client app,
  // so client-side routes work on a hard refresh or direct link.
  app.setNotFoundHandler((request, reply) => {
    if (serveClient && request.method === 'GET' && !/^\/api(\/|$)/.test(request.url)) {
      return reply.html();
    }
    return reply.code(404).send({ message: 'Not Found' });
  });

  if (serveClient) {
    await app.vite.ready();
  }

  return app;
}
