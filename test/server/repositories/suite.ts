import { beforeEach, describe, expect, it } from 'vitest';
import type { BookingData } from '../../../server/models/booking.js';
import type { MeetingType, MeetingTypeData } from '../../../server/models/meeting-type.js';
import type { BookingRepository } from '../../../server/repositories/bookings.js';
import type { MeetingTypeRepository } from '../../../server/repositories/meeting-types.js';
import { ms } from '../fixtures.js';

// The shared repository contract (ADR 0004): the same suite runs on the
// in-memory adapters and on Postgres (PGLite), so the ports stay
// interchangeable. Seeding goes through the port and bookings always reference
// a real, seeded meeting type: in Postgres the foreign key is enforced, while
// the in-memory adapter would happily accept anything.
type RepositoryContract = {
  meetingTypes: MeetingTypeRepository;
  bookings: BookingRepository;
};

export type ContractSetup = {
  // A fresh pair of adapters per test; isolation is the adapter's own concern.
  create: () => RepositoryContract | Promise<RepositoryContract>;
};

const seedData: MeetingTypeData = {
  name: 'Знакомство',
  description: 'Короткий видеозвонок для знакомства',
  durationMinutes: 30,
};

const unknownId = '00000000-0000-0000-0000-000000000000';

function bookingData(meetingType: MeetingType, startMs: number): BookingData {
  return {
    meetingTypeId: meetingType.id,
    meetingTypeName: meetingType.name,
    guestName: 'Мария Петрова',
    startMs,
    // The duration comes from the type, exactly as `draftBooking` derives it.
    endMs: startMs + meetingType.durationMinutes * 60_000,
  };
}

export function describeRepositoryContract(label: string, setup: ContractSetup): void {
  describe(label, () => {
    let repos: RepositoryContract;

    beforeEach(async () => {
      repos = await setup.create();
    });

    describe('репозиторий типов встреч', () => {
      it('create возвращает сущность с непустым id и сохраняет её', async () => {
        const created = await repos.meetingTypes.create(seedData);

        expect(created.id).not.toBe('');
        expect(await repos.meetingTypes.list()).toEqual([created]);
      });

      it('create выдаёт разные id двум записям', async () => {
        const first = await repos.meetingTypes.create(seedData);
        const second = await repos.meetingTypes.create({ ...seedData, name: 'Другой тип' });

        expect(first.id).not.toBe(second.id);
      });

      it('findById находит созданный тип и отдаёт null на промахе', async () => {
        const created = await repos.meetingTypes.create(seedData);

        expect(await repos.meetingTypes.findById(created.id)).toEqual(created);
        expect(await repos.meetingTypes.findById(unknownId)).toBeNull();
      });

      it('list отдаёт записи в порядке вставки и копию массива', async () => {
        const first = await repos.meetingTypes.create(seedData);
        const second = await repos.meetingTypes.create({ ...seedData, name: 'Другой тип' });

        const list = await repos.meetingTypes.list();
        expect(list).toEqual([first, second]);

        list.length = 0;
        expect(await repos.meetingTypes.list()).toEqual([first, second]);
      });
    });

    describe('репозиторий броней', () => {
      it('create возвращает сущность с непустым id и сохраняет её', async () => {
        const meetingType = await repos.meetingTypes.create(seedData);

        const created = await repos.bookings.create(
          bookingData(meetingType, ms('2026-11-17T09:00:00+03:00')),
        );

        expect(created.id).not.toBe('');
        expect(await repos.bookings.list()).toEqual([created]);
      });

      it('create выдаёт разные id двум записям', async () => {
        const meetingType = await repos.meetingTypes.create(seedData);

        const first = await repos.bookings.create(
          bookingData(meetingType, ms('2026-11-17T09:00:00+03:00')),
        );
        const second = await repos.bookings.create(
          bookingData(meetingType, ms('2026-11-17T10:00:00+03:00')),
        );

        expect(first.id).not.toBe(second.id);
      });

      it('list отдаёт записи в порядке вставки, а не по времени начала', async () => {
        const meetingType = await repos.meetingTypes.create(seedData);
        // Inserted out of order on purpose: ordering is the scenario's concern.
        const later = await repos.bookings.create(
          bookingData(meetingType, ms('2026-11-18T09:00:00+03:00')),
        );
        const earlier = await repos.bookings.create(
          bookingData(meetingType, ms('2026-11-17T09:00:00+03:00')),
        );

        expect(await repos.bookings.list()).toEqual([later, earlier]);
      });

      it('list отдаёт копию массива', async () => {
        const meetingType = await repos.meetingTypes.create(seedData);
        const created = await repos.bookings.create(
          bookingData(meetingType, ms('2026-11-17T09:00:00+03:00')),
        );

        const list = await repos.bookings.list();
        list.length = 0;

        expect(await repos.bookings.list()).toEqual([created]);
      });
    });
  });
}
