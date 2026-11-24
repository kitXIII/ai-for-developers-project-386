import type { MeetingType, MeetingTypeData } from '../models/meeting-type.js';

// The meeting type port (ADR 0004): async from the start, so the Postgres
// adapter satisfies it without touching the scenarios (ADR 0011).
export type MeetingTypeRepository = {
  create: (data: MeetingTypeData) => Promise<MeetingType>;
  // A miss is `null` («looked and did not find»), not an exception: the
  // scenario turns it into `DomainError('not_found')`.
  findById: (id: string) => Promise<MeetingType | null>;
  list: () => Promise<MeetingType[]>;
};
