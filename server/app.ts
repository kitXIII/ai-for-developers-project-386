import { resolve } from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import FastifyVite from '@fastify/vite';
import { composeDependencies } from './composition.js';
import type { Schedule } from './models/schedule.js';
import { adminBookingRoutes } from './routes/admin-bookings.js';
import { adminMeetingTypeRoutes } from './routes/admin-meeting-types.js';
import { bookingRoutes } from './routes/bookings.js';
import { registerErrorHandler } from './routes/errors.js';
import { meetingTypeRoutes } from './routes/meeting-types.js';
import { messagesRoutes } from './routes/messages.js';

type BuildAppOptions = {
  // Tests disable the client to avoid starting Vite.
  serveClient?: boolean;
  // Tests disable logging to keep the output clean.
  logger?: boolean;
  // Injected clock for the domain: the only place that reads the real time;
  // tests freeze «сегодня» by passing a constant. The domain lives in epoch-ms,
  // so the composition converts the string at the seam (ADR 0004).
  now?: () => string;
  // The schedule is configuration: the default lives in `composeDependencies()`.
  schedule?: Schedule;
};

export async function buildApp({
  serveClient = true,
  logger = true,
  now,
  schedule,
}: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger });

  // This file is the HTTP shell: the object graph is composed in one named
  // place (ADR 0006), so neither adapters nor the clock conversion live here.
  const deps = composeDependencies({ now, schedule });

  registerErrorHandler(app);

  await app.register(adminMeetingTypeRoutes, { meetingTypes: deps.meetingTypes });
  await app.register(adminBookingRoutes, { bookings: deps.bookings, schedule: deps.schedule });
  await app.register(meetingTypeRoutes, {
    meetingTypes: deps.meetingTypes,
    schedule: deps.schedule,
  });
  await app.register(bookingRoutes, { bookings: deps.bookings, schedule: deps.schedule });
  await app.register(messagesRoutes);

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
