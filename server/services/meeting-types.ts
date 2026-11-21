import { DomainError } from '../models/errors.js';
import { parseMeetingTypeData, type MeetingType } from '../models/meeting-type.js';
import type { MeetingTypeRepository } from '../repositories/meeting-types.js';

// Meeting type scenarios (ADR 0004): the repository arrives as an explicit
// dependency and the scenario owns the domain rules, not the adapter.
type MeetingTypesDeps = {
  meetingTypes: MeetingTypeRepository;
};

export async function listMeetingTypes({ meetingTypes }: MeetingTypesDeps): Promise<MeetingType[]> {
  return meetingTypes.list();
}

export async function getMeetingType(
  { meetingTypes }: MeetingTypesDeps,
  id: string,
): Promise<MeetingType> {
  const meetingType = await meetingTypes.findById(id);
  if (!meetingType) {
    throw new DomainError('not_found', 'errors.domain.meetingType.notFound');
  }
  return meetingType;
}

export async function createMeetingType(
  { meetingTypes }: MeetingTypesDeps,
  fields: Record<string, unknown>,
): Promise<MeetingType> {
  return meetingTypes.create(parseMeetingTypeData(fields));
}
