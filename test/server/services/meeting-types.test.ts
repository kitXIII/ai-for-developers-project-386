import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Persistence } from '../../../server/repositories/persistence.js';
import { getMeetingType } from '../../../server/services/meeting-types.js';
import { createTestPersistence, seedMeetingType } from '../fixtures.js';

// Scenarios are exercised without Fastify (ADR 0004): a fresh PGlite storage
// (ADR 0011) is seeded through the port, errors are observed by kind.
let persistence: Persistence;

beforeEach(async () => {
  persistence = await createTestPersistence();
});

afterEach(async () => {
  await persistence.close();
});

describe('getMeetingType', () => {
  it('возвращает сущность по известному id', async () => {
    const meetingTypes = persistence.meetingTypes;
    const seeded = await seedMeetingType(meetingTypes);

    expect(await getMeetingType({ meetingTypes }, seeded.id)).toEqual(seeded);
  });

  it('бросает not_found на неизвестный id', async () => {
    const meetingTypes = persistence.meetingTypes;

    await expect(
      getMeetingType({ meetingTypes }, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toMatchObject({
      kind: 'not_found',
      key: 'errors.domain.meetingType.notFound',
    });
  });
});
