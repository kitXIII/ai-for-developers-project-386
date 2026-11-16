// PROTOTYPE (тикет #19): порт хранилища типов встреч. Асинхронный с самого начала,
// чтобы БД-адаптер потом встал на это место без переделки сервисов.
import { randomUUID } from 'node:crypto';
import type { MeetingType, MeetingTypeData } from '../models/meeting-type.js';

export type MeetingTypeRepository = {
  create: (data: MeetingTypeData) => Promise<MeetingType>;
  // Неизвестный id — это null, а не 404: контрактная ошибка рождается выше.
  findById: (id: string) => Promise<MeetingType | null>;
  list: () => Promise<MeetingType[]>;
};

export function inMemoryMeetingTypes(): MeetingTypeRepository {
  const items = new Map<string, MeetingType>();

  return {
    create: async (data) => {
      const meetingType: MeetingType = { id: randomUUID(), ...data };
      items.set(meetingType.id, meetingType);
      return meetingType;
    },
    findById: async (id) => items.get(id) ?? null,
    list: async () => [...items.values()],
  };
}
