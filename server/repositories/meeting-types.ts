import { randomUUID } from 'node:crypto';
import type { MeetingType, MeetingTypeData } from '../models/meeting-type.js';

// The meeting type port (ADR 0004): async from the start, so a database
// adapter can replace this one without touching the scenarios.
export type MeetingTypeRepository = {
  create: (data: MeetingTypeData) => Promise<MeetingType>;
  // A miss is `null` («looked and did not find»), not an exception: the
  // scenario turns it into `DomainError('not_found')`.
  findById: (id: string) => Promise<MeetingType | null>;
  list: () => Promise<MeetingType[]>;
};

// In-memory adapter: one instance per app, never a module singleton, so test
// runs stay isolated. `id` is generated here — a database adapter uses its
// schema instead.
export function inMemoryMeetingTypes(): MeetingTypeRepository {
  const meetingTypes = new Map<string, MeetingType>();

  return {
    create: async (data) => {
      const meetingType: MeetingType = { id: randomUUID(), ...data };
      meetingTypes.set(meetingType.id, meetingType);
      return meetingType;
    },
    findById: async (id) => meetingTypes.get(id) ?? null,
    // A copy, in insertion order: mutating the result does not touch the store.
    list: async () => [...meetingTypes.values()],
  };
}
