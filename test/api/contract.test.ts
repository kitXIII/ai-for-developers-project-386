import * as Ajv2020Module from 'ajv/dist/2020.js';
import type { AdminMeetingType, Booking } from '@app/api/types';
import type { FastifyInstance } from 'fastify';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../server/app.js';

type JsonSchema = Record<string, unknown>;

// ajv ships the 2020 build as CJS with an ESM-style declaration, which TS 7's
// NodeNext interop surfaces as the module namespace, so unwrap the class manually.
type CompiledValidator = ((data: unknown) => boolean) & { errors: unknown };
type Ajv2020Like = new (options?: { strict?: boolean }) => {
  compile: (schema: JsonSchema) => CompiledValidator;
};

const Ajv2020 = (
  Ajv2020Module as unknown as { default: new (options?: { strict?: boolean }) => unknown }
).default as Ajv2020Like;

type Operation = {
  responses: Record<string, { content?: Record<string, { schema?: JsonSchema }> }>;
};

// The OpenAPI document is generated from TypeSpec, so validating live server
// responses against it catches drift between the server and the contract.
const openapi = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../packages/api/generated/openapi.json'), 'utf8'),
) as { paths: Record<string, Record<string, Operation>> };

type OperationCase = {
  method: 'GET' | 'POST';
  // Concrete request URL; differs from the document template when it carries an id.
  path: string;
  // Key in openapi.paths; defaults to `path`.
  pathTemplate?: string;
  // Expected status; the body must match the schema documented for exactly this status.
  status: number;
  payload?: Record<string, unknown>;
  // Seeds state through the API and builds the payload lazily when the case
  // needs real ids or a genuinely free slot (docs/test-plan.md).
  prepare?: (app: FastifyInstance) => Promise<Record<string, unknown>>;
};

const adminMeetingTypesPath = '/api/v1/admin/meeting-types';
const meetingTypesPath = '/api/v1/meeting-types';
const bookingsPath = '/api/v1/bookings';
const validMeetingType = {
  name: 'Знакомство',
  description: 'Короткий видеозвонок для знакомства',
  durationMinutes: 30,
};
const unknownMeetingTypeId = '00000000-0000-0000-0000-000000000000';
const validGuestName = 'Мария Петрова';

// The table grows ticket by ticket: #11 covers the admin meeting-type operations,
// later tickets extend it with the guest operations (#12–#14) and admin bookings (#15).
const operations: OperationCase[] = [
  { method: 'POST', path: adminMeetingTypesPath, status: 201, payload: validMeetingType },
  {
    method: 'POST',
    path: adminMeetingTypesPath,
    status: 400,
    payload: { ...validMeetingType, name: '' },
  },
  { method: 'GET', path: adminMeetingTypesPath, status: 200 },
  {
    method: 'GET',
    path: `${adminMeetingTypesPath}/${unknownMeetingTypeId}`,
    pathTemplate: `${adminMeetingTypesPath}/{id}`,
    status: 404,
  },
  { method: 'GET', path: meetingTypesPath, status: 200 },
  {
    method: 'GET',
    path: `${meetingTypesPath}/${unknownMeetingTypeId}`,
    pathTemplate: `${meetingTypesPath}/{id}`,
    status: 404,
  },
  {
    method: 'GET',
    path: `${meetingTypesPath}/${unknownMeetingTypeId}/slots`,
    pathTemplate: `${meetingTypesPath}/{id}/slots`,
    status: 404,
  },
  // Гость бронирует слот: 201/400/404/409 против схем документа (#14).
  {
    method: 'POST',
    path: bookingsPath,
    status: 201,
    prepare: async (app) => {
      const created = await createMeetingType(app, validMeetingType);
      return bookingPayload(created.id, await firstFreeSlotStart(app, created.id));
    },
  },
  {
    method: 'POST',
    path: bookingsPath,
    status: 400,
    payload: { ...bookingPayload(unknownMeetingTypeId), guestName: '' },
  },
  {
    method: 'POST',
    path: bookingsPath,
    status: 404,
    payload: bookingPayload(unknownMeetingTypeId),
  },
  {
    method: 'POST',
    path: bookingsPath,
    status: 409,
    prepare: async (app) => {
      // Повторная бронь занятого слота: первый запрос занимает свободный слот,
      // второй — тот же самый — отвечает 409.
      const created = await createMeetingType(app, validMeetingType);
      const start = await firstFreeSlotStart(app, created.id);
      await bookSlot(app, created.id, start);
      return bookingPayload(created.id, start);
    },
  },
];

// State is seeded through the API itself — the contract suite never touches
// storage internals (docs/test-plan.md).
async function createMeetingType(
  app: FastifyInstance,
  payload: Record<string, unknown>,
): Promise<AdminMeetingType> {
  const response = await app.inject({ method: 'POST', url: adminMeetingTypesPath, payload });
  expect(response.statusCode).toBe(201);
  return response.json();
}

// A far-future moment for cases where only the body shape matters: validation
// (400) and the unknown type (404) are answered before any slot math runs.
function bookingPayload(
  meetingTypeId: string,
  start = '2030-01-10T10:00:00+03:00',
): Record<string, unknown> {
  return { meetingTypeId, start, guestName: validGuestName };
}

// A genuinely free slot from the server's own answer, so the booking cases stay
// deterministic whatever the real date is (docs/test-plan.md).
async function firstFreeSlotStart(app: FastifyInstance, meetingTypeId: string): Promise<string> {
  const response = await app.inject({
    method: 'GET',
    url: `${meetingTypesPath}/${meetingTypeId}/slots`,
  });
  expect(response.statusCode).toBe(200);
  const start = (response.json() as SlotsDays)[0]?.slots[0]?.start;
  expect(start, 'the booking window has at least one free slot').toBeTruthy();
  return start;
}

async function bookSlot(
  app: FastifyInstance,
  meetingTypeId: string,
  start: string,
  guestName = validGuestName,
): Promise<Booking> {
  const response = await app.inject({
    method: 'POST',
    url: bookingsPath,
    payload: { meetingTypeId, start, guestName },
  });
  expect(response.statusCode).toBe(201);
  return response.json();
}

// ajv compiles schemas standalone, so inline the document-local `#/...` refs first.
function dereference(value: unknown, root: unknown, depth = 0): unknown {
  if (depth > 20 || value === null || typeof value !== 'object') {
    return value;
  }
  const ref = (value as Record<string, unknown>).$ref;
  if (typeof ref === 'string' && ref.startsWith('#/')) {
    let target: unknown = root;
    for (const segment of ref.slice(2).split('/')) {
      target = (target as Record<string, unknown>)?.[
        segment.replaceAll('~1', '/').replaceAll('~0', '~')
      ];
    }
    return dereference(target, root, depth + 1);
  }
  if (Array.isArray(value)) {
    return value.map((item) => dereference(item, root, depth + 1));
  }
  const copy: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    copy[key] = dereference(item, root, depth + 1);
  }
  return copy;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('API contract', () => {
  let app: FastifyInstance;
  const ajv = new Ajv2020({ strict: false });

  beforeAll(async () => {
    app = await buildApp({ serveClient: false, logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  // Asserts the status is documented for the operation and validates the body
  // against the JSON Schema documented for exactly that status.
  function expectMatchesContract(
    method: 'GET' | 'POST',
    pathTemplate: string,
    status: number,
    body: unknown,
  ): void {
    const operation = openapi.paths[pathTemplate]?.[method.toLowerCase()];
    expect(
      operation,
      `${method} ${pathTemplate} is missing from the OpenAPI document`,
    ).toBeDefined();

    const documented = operation?.responses[String(status)];
    expect(
      documented,
      `${method} ${pathTemplate} does not document status ${status}`,
    ).toBeDefined();

    const schema = dereference(documented?.content?.['application/json']?.schema, openapi) as
      | JsonSchema
      | undefined;
    if (schema && typeof schema.type === 'string') {
      const validate = ajv.compile(schema);
      expect(validate(body), JSON.stringify(validate.errors)).toBe(true);
    }
  }

  it.each(operations)(
    '$method $path → $status',
    async ({ method, path, pathTemplate, status, payload, prepare }) => {
      const body = prepare ? await prepare(app) : payload;
      const response = await app.inject({ method, url: path, payload: body });

      expect(response.statusCode).toBe(status);
      expectMatchesContract(method, pathTemplate ?? path, status, response.json());
    },
  );

  it(`GET ${adminMeetingTypesPath}/{id} returns the seeded type`, async () => {
    const created = await createMeetingType(app, validMeetingType);

    const response = await app.inject({
      method: 'GET',
      url: `${adminMeetingTypesPath}/${created.id}`,
    });

    expect(response.statusCode).toBe(200);
    expectMatchesContract('GET', `${adminMeetingTypesPath}/{id}`, 200, response.json());
    expect(response.json()).toEqual(created);
  });

  it(`POST ${adminMeetingTypesPath} returns the created type with a server-generated UUID`, async () => {
    const response = await app.inject({
      method: 'POST',
      url: adminMeetingTypesPath,
      payload: validMeetingType,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      ...validMeetingType,
      id: expect.stringMatching(uuidPattern),
    });
  });

  it.each([
    ['название отсутствует', { description: 'Обсуждаем проекты', durationMinutes: 30 }],
    ['название пустое', { ...validMeetingType, name: '' }],
    ['название из одних пробелов', { ...validMeetingType, name: '   ' }],
    ['название с пробелом в начале', { ...validMeetingType, name: ' Знакомство' }],
    ['название с пробелом в конце', { ...validMeetingType, name: 'Знакомство ' }],
    ['название длиннее 100 символов', { ...validMeetingType, name: 'а'.repeat(101) }],
    ['описание отсутствует', { name: validMeetingType.name, durationMinutes: 30 }],
    ['описание длиннее 1000 символов', { ...validMeetingType, description: 'о'.repeat(1001) }],
    ['длительность меньше 5', { ...validMeetingType, durationMinutes: 4 }],
    ['длительность больше 540', { ...validMeetingType, durationMinutes: 541 }],
    ['длительность не целая', { ...validMeetingType, durationMinutes: 30.5 }],
    ['длительность — строка', { ...validMeetingType, durationMinutes: '30' }],
    ['тело отсутствует', undefined],
  ] as [string, Record<string, unknown> | undefined][])(
    `POST ${adminMeetingTypesPath} → 400 validation_failed: %s`,
    async (_title, payload) => {
      const response = await app.inject({ method: 'POST', url: adminMeetingTypesPath, payload });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expectMatchesContract('POST', adminMeetingTypesPath, 400, body);
      expect(body).toMatchObject({ code: 'validation_failed' });
      expect(body.message).toBeTruthy();
    },
  );

  it(`GET ${adminMeetingTypesPath}/{unknown id} → 404 meeting_type_not_found`, async () => {
    const response = await app.inject({
      method: 'GET',
      url: `${adminMeetingTypesPath}/${unknownMeetingTypeId}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'meeting_type_not_found' });
  });

  it(`GET ${meetingTypesPath} lists the type created by the owner`, async () => {
    const created = await createMeetingType(app, validMeetingType);

    const response = await app.inject({ method: 'GET', url: meetingTypesPath });

    expect(response.statusCode).toBe(200);
    expectMatchesContract('GET', meetingTypesPath, 200, response.json());
    expect(response.json()).toContainEqual(created);
  });

  it(`GET ${meetingTypesPath}/{id} returns the seeded type for guests`, async () => {
    const created = await createMeetingType(app, validMeetingType);

    const response = await app.inject({
      method: 'GET',
      url: `${meetingTypesPath}/${created.id}`,
    });

    expect(response.statusCode).toBe(200);
    expectMatchesContract('GET', `${meetingTypesPath}/{id}`, 200, response.json());
    // Guest view (ADR 0003) is a separate contract model; while the fields
    // coincide it carries exactly the stored data.
    expect(response.json()).toEqual(created);
  });

  it(`GET ${meetingTypesPath}/{unknown id} → 404 meeting_type_not_found`, async () => {
    const response = await app.inject({
      method: 'GET',
      url: `${meetingTypesPath}/${unknownMeetingTypeId}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'meeting_type_not_found' });
  });

  it(`GET ${meetingTypesPath}/{unknown id}/slots → 404 meeting_type_not_found`, async () => {
    const response = await app.inject({
      method: 'GET',
      url: `${meetingTypesPath}/${unknownMeetingTypeId}/slots`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'meeting_type_not_found' });
  });

  it(`GET ${meetingTypesPath}/{id}/slots returns the booking window on the type's grid`, async () => {
    // A pristine app instance: bookings made by the POST cases above must not
    // shift the day's first slot away from 09:00 (slots hide booked starts).
    const slotsApp = await buildApp({ serveClient: false, logger: false });
    try {
      const created = await createMeetingType(slotsApp, validMeetingType);

      const response = await slotsApp.inject({
        method: 'GET',
        url: `${meetingTypesPath}/${created.id}/slots`,
      });

      expect(response.statusCode).toBe(200);
      const days = response.json() as SlotsDays;
      expectMatchesContract('GET', `${meetingTypesPath}/{id}/slots`, 200, days);

      // Window D+1…D+14 by the UTC+3 calendar, computed in the test (the contract
      // suite reads the clock; only server domain logic must not).
      const today = new Date(Date.now() + utc3OffsetMs).toISOString().slice(0, 10);
      const windowWeekdays = new Set<string>();
      for (let dayOffset = 1; dayOffset <= 14; dayOffset += 1) {
        const date = new Date(Date.parse(`${today}T00:00:00Z`) + dayOffset * dayMs)
          .toISOString()
          .slice(0, 10);
        const weekday = new Date(`${date}T12:00:00+03:00`).getUTCDay();
        if (weekday !== 0 && weekday !== 6) {
          windowWeekdays.add(date);
        }
      }

      expect(days.length).toBeGreaterThan(0);
      let previousDate = '';
      for (const day of days) {
        expect(day.date > previousDate, 'days are ascending and unique').toBe(true);
        previousDate = day.date;
        expect(windowWeekdays.has(day.date), `${day.date} is a weekday of the booking window`).toBe(
          true,
        );

        let previousEnd = '';
        for (const slot of day.slots) {
          expect(slot.start.endsWith('+03:00'), 'moments carry the +03:00 offset').toBe(true);
          expect(slot.end.endsWith('+03:00'), 'moments carry the +03:00 offset').toBe(true);
          expect(slot.start >= previousEnd, 'slots do not overlap').toBe(true);
          previousEnd = slot.end;
        }
        const first = days[0]?.slots[0] ?? { start: '', end: '' };
        expect(minutesOfDay(day.slots[0]?.start ?? first.start), 'grid starts at 09:00 UTC+3').toBe(
          540,
        );
        expect(
          minutesOfDay(day.slots.at(-1)?.end ?? ''),
          'day ends at 18:00 UTC+3 at the latest',
        ).toBeLessThanOrEqual(1080);
        for (const slot of day.slots) {
          expect(
            (minutesOfDay(slot.start) - 540) % created.durationMinutes,
            'starts stay on the grid',
          ).toBe(0);
          expect(
            minutesOfDay(slot.end) - minutesOfDay(slot.start),
            'slot length is the type duration',
          ).toBe(created.durationMinutes);
        }
      }
    } finally {
      await slotsApp.close();
    }
  });

  it(`POST ${bookingsPath} computes end, denormalizes the type name and answers in +03:00`, async () => {
    const created = await createMeetingType(app, validMeetingType);
    const start = await firstFreeSlotStart(app, created.id);

    // The same instant with a different input offset (+00:00): the response
    // must still carry the contract offset +03:00.
    const startWithZeroOffset = new Date(Date.parse(start)).toISOString();

    const response = await app.inject({
      method: 'POST',
      url: bookingsPath,
      payload: bookingPayload(created.id, startWithZeroOffset),
    });

    expect(response.statusCode).toBe(201);
    expectMatchesContract('POST', bookingsPath, 201, response.json());
    const booking = response.json() as Booking;
    expect(booking.id).toMatch(uuidPattern);
    expect(booking.meetingTypeId).toBe(created.id);
    expect(booking.meetingTypeName, 'the type name is denormalized').toBe(created.name);
    expect(booking.guestName).toBe(validGuestName);
    expect(booking.start, 'the response moment keeps the +03:00 offset').toBe(start);
    expect(booking.end.endsWith('+03:00'), 'the end keeps the +03:00 offset').toBe(true);
    expect(
      Date.parse(booking.end) - Date.parse(booking.start),
      'end is computed by the server from the type duration',
    ).toBe(created.durationMinutes * 60_000);
  });

  it(`POST ${bookingsPath} allows a booking starting exactly when another ends`, async () => {
    const created = await createMeetingType(app, validMeetingType);

    const slotsResponse = await app.inject({
      method: 'GET',
      url: `${meetingTypesPath}/${created.id}/slots`,
    });
    const [first, second] = (slotsResponse.json() as SlotsDays)[0]?.slots ?? [];
    expect(second, 'the day has at least two free slots').toBeTruthy();

    await bookSlot(app, created.id, first.start);

    const response = await app.inject({
      method: 'POST',
      url: bookingsPath,
      payload: bookingPayload(created.id, second.start),
    });

    expect(response.statusCode).toBe(201);
  });

  it(`POST ${bookingsPath} → 409 slot_taken when the time is taken by another meeting type`, async () => {
    const first = await createMeetingType(app, validMeetingType);
    const second = await createMeetingType(app, { ...validMeetingType, name: 'Другой тип' });
    const start = await firstFreeSlotStart(app, first.id);
    await bookSlot(app, first.id, start);

    // The same grid (both types are 30 minutes), so the start is a legitimate
    // slot of the second type — only the overlap makes it a conflict.
    const response = await app.inject({
      method: 'POST',
      url: bookingsPath,
      payload: bookingPayload(second.id, start),
    });

    expect(response.statusCode).toBe(409);
    expectMatchesContract('POST', bookingsPath, 409, response.json());
    expect(response.json()).toMatchObject({ code: 'slot_taken' });
  });

  it.each([
    ['имя отсутствует', { guestName: undefined }],
    ['имя пустое', { guestName: '' }],
    ['имя из одних пробелов', { guestName: '   ' }],
    ['имя с пробелом в начале', { guestName: ' Мария' }],
    ['имя с пробелом в конце', { guestName: 'Мария ' }],
    ['имя длиннее 100 символов', { guestName: 'а'.repeat(101) }],
    ['тип встречи отсутствует', { meetingTypeId: undefined }],
    ['старт отсутствует', { start: undefined }],
    ['старт без смещения', { start: '2030-01-10T10:00:00' }],
    ['старт — не момент', { start: 'завтра утром' }],
  ] as [string, Record<string, unknown>][])(
    `POST ${bookingsPath} → 400 validation_failed: %s`,
    async (_title, overrides) => {
      const payload = { ...bookingPayload(unknownMeetingTypeId), ...overrides };

      const response = await app.inject({ method: 'POST', url: bookingsPath, payload });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expectMatchesContract('POST', bookingsPath, 400, body);
      expect(body).toMatchObject({ code: 'validation_failed' });
      expect(body.message).toBeTruthy();
    },
  );

  // For the window/schedule branches «сегодня» is frozen: a dedicated app
  // instance with a constant clock (docs/test-plan.md).
  describe(`POST ${bookingsPath} with frozen today`, () => {
    // A Monday: the next day is a clean weekday and the same week's weekend is
    // inside the window. The suite reads the clock; only server logic must not.
    const frozenNow = '2026-11-16T12:00:00+03:00';
    let frozenApp: FastifyInstance;

    beforeAll(async () => {
      frozenApp = await buildApp({ serveClient: false, logger: false, now: () => frozenNow });
    });

    afterAll(async () => {
      await frozenApp.close();
    });

    // UTC+3 calendar date (YYYY-MM-DD) of the frozen moment shifted by N days.
    const frozenDate = (dayOffset: number): string =>
      new Date(Date.parse(frozenNow) + dayOffset * dayMs + utc3OffsetMs).toISOString().slice(0, 10);

    it('→ 409 outside_window for a start today or beyond the 14-day window', async () => {
      const created = await createMeetingType(frozenApp, validMeetingType);

      for (const start of [
        `${frozenDate(0)}T10:00:00+03:00`, // today is never bookable
        `${frozenDate(15)}T10:00:00+03:00`, // the window is D+1…D+14
      ]) {
        const response = await frozenApp.inject({
          method: 'POST',
          url: bookingsPath,
          payload: bookingPayload(created.id, start),
        });
        expect(response.statusCode, start).toBe(409);
        expectMatchesContract('POST', bookingsPath, 409, response.json());
        expect(response.json()).toMatchObject({ code: 'outside_window' });
      }
    });

    it('→ 409 outside_schedule for a weekend start inside the window', async () => {
      const created = await createMeetingType(frozenApp, validMeetingType);

      const response = await frozenApp.inject({
        method: 'POST',
        url: bookingsPath,
        payload: bookingPayload(created.id, `${frozenDate(5)}T10:00:00+03:00`),
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({ code: 'outside_schedule' });
    });

    it('→ 409 outside_schedule for a start off the type grid', async () => {
      const created = await createMeetingType(frozenApp, validMeetingType);

      // 10:10 is not on the 30-minute grid from 09:00.
      const response = await frozenApp.inject({
        method: 'POST',
        url: bookingsPath,
        payload: bookingPayload(created.id, `${frozenDate(1)}T10:10:00+03:00`),
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({ code: 'outside_schedule' });
    });

    it('→ 409 outside_schedule at the working-day edges', async () => {
      const created = await createMeetingType(frozenApp, validMeetingType);

      // 08:30 is grid-aligned but before 09:00; 18:00 is grid-aligned but its
      // end (18:30) passes the 18:00 end of the working day.
      for (const start of [`${frozenDate(1)}T08:30:00+03:00`, `${frozenDate(1)}T18:00:00+03:00`]) {
        const response = await frozenApp.inject({
          method: 'POST',
          url: bookingsPath,
          payload: bookingPayload(created.id, start),
        });
        expect(response.statusCode, start).toBe(409);
        expect(response.json()).toMatchObject({ code: 'outside_schedule' });
      }
    });
  });
});

type SlotsDays = Array<{ date: string; slots: Array<{ start: string; end: string }> }>;

const dayMs = 24 * 60 * 60 * 1000;
const utc3OffsetMs = 3 * 60 * 60 * 1000;

// Wall-clock minutes of a `YYYY-MM-DDTHH:mm:ss+03:00` moment string.
function minutesOfDay(moment: string): number {
  return Number(moment.slice(11, 13)) * 60 + Number(moment.slice(14, 16));
}
