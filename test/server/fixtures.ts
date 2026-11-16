import type { MeetingTypeData } from '../../server/models/meeting-type.js';
import type { MeetingTypeRepository } from '../../server/repositories/meeting-types.js';

// The shared seed of the scenario/repository tests (ADR 0004): the production
// in-memory adapter is used as-is, seeded through its own port.
const seedData: MeetingTypeData = {
  name: 'Знакомство',
  description: 'Короткий видеозвонок для знакомства',
  durationMinutes: 30,
};

export async function seedMeetingType(
  meetingTypes: MeetingTypeRepository,
  data: Partial<MeetingTypeData> = {},
) {
  return meetingTypes.create({ ...seedData, ...data });
}
