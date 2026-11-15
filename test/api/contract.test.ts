import * as Ajv2020Module from 'ajv/dist/2020.js';
import type { AdminMeetingType } from '@app/api/types';
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
};

const adminMeetingTypesPath = '/api/v1/admin/meeting-types';
const meetingTypesPath = '/api/v1/meeting-types';
const validMeetingType = {
  name: 'Знакомство',
  description: 'Короткий видеозвонок для знакомства',
  durationMinutes: 30,
};
const unknownMeetingTypeId = '00000000-0000-0000-0000-000000000000';

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
    async ({ method, path, pathTemplate, status, payload }) => {
      const response = await app.inject({ method, url: path, payload });

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
    const created = await createMeetingType(app, validMeetingType);

    const response = await app.inject({
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
  });
});

type SlotsDays = Array<{ date: string; slots: Array<{ start: string; end: string }> }>;

const dayMs = 24 * 60 * 60 * 1000;
const utc3OffsetMs = 3 * 60 * 60 * 1000;

// Wall-clock minutes of a `YYYY-MM-DDTHH:mm:ss+03:00` moment string.
function minutesOfDay(moment: string): number {
  return Number(moment.slice(11, 13)) * 60 + Number(moment.slice(14, 16));
}
