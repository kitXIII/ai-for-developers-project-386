import { resolve } from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import FastifyVite from '@fastify/vite';
import { DEFAULT_SCHEDULE, assertSchedule, type Schedule } from './models/schedule.js';
import { inMemoryBookings } from './repositories/bookings.js';
import { inMemoryMeetingTypes } from './repositories/meeting-types.js';
import { adminBookingRoutes } from './routes/admin-bookings.js';
import { adminMeetingTypeRoutes } from './routes/admin-meeting-types.js';
import { bookingRoutes } from './routes/bookings.js';
import { registerErrorHandler } from './routes/errors.js';
import { meetingTypeRoutes } from './routes/meeting-types.js';
import {
  createBooking,
  listUpcomingBookings,
  type CreateBookingInput,
} from './services/bookings.js';
import { createMeetingType, getMeetingType, listMeetingTypes } from './services/meeting-types.js';
import { listSlots } from './services/slots.js';

type BuildAppOptions = {
  // Tests disable the client to avoid starting Vite.
  serveClient?: boolean;
  // Tests disable logging to keep the output clean.
  logger?: boolean;
  // Injected clock for the domain: the only place that reads the real time;
  // tests freeze «сегодня» by passing a constant. The domain lives in epoch-ms,
  // so the wiring converts the string at the seam (ADR 0004) and the contract
  // test keeps injecting strings.
  now?: () => string;
  // The schedule is configuration: the default lives here, not in the models.
  schedule?: Schedule;
};

export async function buildApp({
  serveClient = true,
  logger = true,
  now = () => new Date().toISOString(),
  schedule = DEFAULT_SCHEDULE,
}: BuildAppOptions = {}): Promise<FastifyInstance> {
  // Configuration errors fail the process here, before any route is registered.
  assertSchedule(schedule);

  const app = Fastify({ logger });

  // Per-instance adapters — never module singletons, so test runs stay
  // isolated (docs/test-plan.md). Routes get bound scenarios, never the
  // repositories themselves; the clock is converted to epoch-ms here.
  const nowMs = () => Date.parse(now());
  const meetingTypes = inMemoryMeetingTypes();
  const bookings = inMemoryBookings();

  const listAllMeetingTypes = () => listMeetingTypes({ meetingTypes });
  const findMeetingType = (id: string) => getMeetingType({ meetingTypes }, id);
  const createType = (fields: Record<string, unknown>) =>
    createMeetingType({ meetingTypes }, fields);
  const registerBooking = (input: CreateBookingInput) =>
    createBooking({ meetingTypes, bookings, schedule, now: nowMs }, input);
  const listUpcoming = () => listUpcomingBookings({ bookings, now: nowMs });
  const listSlotsFor = (id: string) =>
    listSlots({ meetingTypes, bookings, schedule, now: nowMs }, id);

  registerErrorHandler(app);

  await app.register(adminMeetingTypeRoutes, {
    createMeetingType: createType,
    listMeetingTypes: listAllMeetingTypes,
    getMeetingType: findMeetingType,
  });
  await app.register(adminBookingRoutes, {
    listUpcomingBookings: listUpcoming,
    schedule,
  });
  await app.register(meetingTypeRoutes, {
    listMeetingTypes: listAllMeetingTypes,
    getMeetingType: findMeetingType,
    listSlots: listSlotsFor,
    schedule,
  });
  await app.register(bookingRoutes, { createBooking: registerBooking, schedule });

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
