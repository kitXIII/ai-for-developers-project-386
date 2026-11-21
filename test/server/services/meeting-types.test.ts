import { describe, expect, it } from 'vitest';
import { inMemoryMeetingTypes } from '../../../server/repositories/meeting-types.js';
import { getMeetingType } from '../../../server/services/meeting-types.js';
import { seedMeetingType } from '../fixtures.js';

// Scenarios are exercised without Fastify (ADR 0004): the production in-memory
// adapter is seeded through its own port, errors are observed by kind.
describe('getMeetingType', () => {
  it('возвращает сущность по известному id', async () => {
    const meetingTypes = inMemoryMeetingTypes();
    const seeded = await seedMeetingType(meetingTypes);

    expect(await getMeetingType({ meetingTypes }, seeded.id)).toEqual(seeded);
  });

  it('бросает not_found на неизвестный id', async () => {
    const meetingTypes = inMemoryMeetingTypes();

    await expect(
      getMeetingType({ meetingTypes }, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toMatchObject({
      kind: 'not_found',
      key: 'errors.domain.meetingType.notFound',
    });
  });
});
