import type { GuestMeetingType, SlotsDay as SlotsDayResponse } from '@app/api/types';
import type { FastifyInstance } from 'fastify';
import type { MeetingType } from '../models/meeting-type.js';
import type { Schedule } from '../models/schedule.js';
import type { Slot, SlotsDay } from '../models/slots.js';
import { formatMoment } from '../shared/moment.js';

// ADR 0003: guest and owner views are separate contract models, so the guest
// shape is built explicitly from the stored entity even while fields coincide.
function toGuestView({ id, name, description, durationMinutes }: MeetingType): GuestMeetingType {
  return { id, name, description, durationMinutes };
}

// The calendar leaves the domain in epoch-ms; the contract moments and the
// day's local date are assembled here, in the only layer that knows the format
// (ADR 0004).
function toContractSlots(days: SlotsDay[], schedule: Schedule): SlotsDayResponse[] {
  return days.map(({ dayStartMs, slots }) => ({
    date: formatMoment(dayStartMs, schedule).slice(0, 10),
    slots: slots.map(({ startMs, endMs }: Slot) => ({
      start: formatMoment(startMs, schedule),
      end: formatMoment(endMs, schedule),
    })),
  }));
}

// Scenarios arrive bound to their dependencies from `buildApp()`: the adapter
// never sees the repositories.
type MeetingTypeRoutesOptions = {
  listMeetingTypes: () => Promise<MeetingType[]>;
  getMeetingType: (id: string) => Promise<MeetingType>;
  listSlots: (id: string) => Promise<SlotsDay[]>;
  schedule: Schedule;
};

export async function meetingTypeRoutes(
  app: FastifyInstance,
  { listMeetingTypes, getMeetingType, listSlots, schedule }: MeetingTypeRoutesOptions,
): Promise<void> {
  app.get('/api/v1/meeting-types', async () => (await listMeetingTypes()).map(toGuestView));

  app.get('/api/v1/meeting-types/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(toGuestView(await getMeetingType(id)));
  });

  // The whole booking window comes back in one response; days without free
  // slots are omitted (the client disables them in the calendar).
  app.get('/api/v1/meeting-types/:id/slots', async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.send(toContractSlots(await listSlots(id), schedule));
  });
}
