// PROTOTYPE (тикет #19): сущность «Тип встречи» со своими инвариантами.
// Импортирует только домен — ни HTTP, ни хранилища.
import { DomainError } from './errors.js';

export type MeetingType = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
};

export type MeetingTypeData = Omit<MeetingType, 'id'>;

// Инварианты значения: 1–100 символов, не из одних пробелов, без пробелов по краям.
const shortText = /^\S(?:.*\S)?$/;

export function assertValidMeetingType({
  name,
  description,
  durationMinutes,
}: MeetingTypeData): void {
  if (typeof name !== 'string' || name.length < 1 || name.length > 100 || !shortText.test(name)) {
    throw new DomainError(
      'invalid_value',
      'Название обязательно: от 1 до 100 символов, без пробелов по краям.',
    );
  }
  if (typeof description !== 'string' || description.length > 1000) {
    throw new DomainError('invalid_value', 'Описание обязательно: до 1000 символов.');
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 540) {
    throw new DomainError('invalid_value', 'Длительность — целое число минут от 5 до 540.');
  }
}
