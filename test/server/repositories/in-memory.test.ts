import { describe, expect, it } from 'vitest';
import { inMemoryMeetingTypes } from '../../../server/repositories/meeting-types.js';
import { seedMeetingType } from '../fixtures.js';

// The port contract (ADR 0004): a fresh adapter per test, seeding through
// `create()`, no mocks — writes are observed through `list()`.
describe('in-memory репозиторий типов встреч', () => {
  it('create возвращает сущность с непустым id и сохраняет её', async () => {
    const meetingTypes = inMemoryMeetingTypes();

    const created = await seedMeetingType(meetingTypes);

    expect(created.id).not.toBe('');
    expect(await meetingTypes.list()).toEqual([created]);
  });

  it('create выдаёт разные id двум записям', async () => {
    const meetingTypes = inMemoryMeetingTypes();

    const first = await seedMeetingType(meetingTypes);
    const second = await seedMeetingType(meetingTypes, { name: 'Другой тип' });

    expect(first.id).not.toBe(second.id);
  });

  it('findById находит созданный тип и отдаёт null на промахе', async () => {
    const meetingTypes = inMemoryMeetingTypes();
    const created = await seedMeetingType(meetingTypes);

    expect(await meetingTypes.findById(created.id)).toEqual(created);
    expect(await meetingTypes.findById('00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('list отдаёт записи в порядке вставки и копию массива', async () => {
    const meetingTypes = inMemoryMeetingTypes();
    const first = await seedMeetingType(meetingTypes);
    const second = await seedMeetingType(meetingTypes, { name: 'Другой тип' });

    const list = await meetingTypes.list();
    expect(list).toEqual([first, second]);

    list.length = 0;
    expect(await meetingTypes.list()).toEqual([first, second]);
  });
});
