import { describe, expect, it } from 'vitest';
import {
  apiErrorKey,
  errorCodeOf,
  isConflictCode,
  isMeetingTypeNotFound,
} from '../../client/lib/api-errors.js';

// React Query rejects with the contract envelope `{ code, message }` (the SDK
// throws the parsed body). The client maps the machine code to a catalog key
// instead of matching wording (ADR 0007).
describe('apiErrorKey', () => {
  it('отдаёт ключ каталога по коду контракта', () => {
    expect(apiErrorKey({ code: 'validation_failed', message: 'ignored' })).toBe(
      'errors.api.validation_failed',
    );
    expect(apiErrorKey({ code: 'meeting_type_not_found', message: 'ignored' })).toBe(
      'errors.api.meeting_type_not_found',
    );
    expect(apiErrorKey({ code: 'slot_taken', message: 'ignored' })).toBe('errors.api.slot_taken');
    expect(apiErrorKey({ code: 'outside_window', message: 'ignored' })).toBe(
      'errors.api.outside_window',
    );
    expect(apiErrorKey({ code: 'outside_schedule', message: 'ignored' })).toBe(
      'errors.api.outside_schedule',
    );
  });

  it('неизвестную ошибку сводит к errors.unexpected', () => {
    expect(apiErrorKey(new Error('network'))).toBe('errors.unexpected');
    expect(apiErrorKey(null)).toBe('errors.unexpected');
    expect(apiErrorKey('boom')).toBe('errors.unexpected');
    expect(apiErrorKey({ code: 'not_a_contract_code' })).toBe('errors.unexpected');
    expect(apiErrorKey({ code: 42 })).toBe('errors.unexpected');
  });

  // A failure without a contract code has no meaning the catalog could name, so
  // each screen passes the phrase it showed before the catalog existed.
  it('сбой без кода контракта отдаёт фолбэк экрана', () => {
    expect(apiErrorKey(new Error('network'), 'booking.confirm.createFailed')).toBe(
      'booking.confirm.createFailed',
    );
    expect(apiErrorKey({ message: 'offline' }, 'admin.createModal.failed')).toBe(
      'admin.createModal.failed',
    );
  });

  it('код контракта сильнее фолбэка экрана', () => {
    expect(apiErrorKey({ code: 'validation_failed' }, 'booking.confirm.createFailed')).toBe(
      'errors.api.validation_failed',
    );
    expect(apiErrorKey({ code: 'slot_taken' }, 'admin.createModal.failed')).toBe(
      'errors.api.slot_taken',
    );
  });

  // A code outside `ErrorCode` is a broken contract envelope, not a plain
  // failure: it must stay visible as unexpected instead of hiding under the
  // screen's fallback.
  it('неконтрактный код не прячется за фолбэком экрана', () => {
    expect(apiErrorKey({ code: 'not_a_contract_code' }, 'booking.confirm.createFailed')).toBe(
      'errors.unexpected',
    );
    expect(apiErrorKey({ code: 42 }, 'admin.createModal.failed')).toBe('errors.unexpected');
  });
});

describe('errorCodeOf', () => {
  it('достаёт код контракта из конверта ошибки', () => {
    expect(errorCodeOf({ code: 'slot_taken', message: 'ignored' })).toBe('slot_taken');
  });

  it('возвращает null для всего, что не несёт код контракта', () => {
    expect(errorCodeOf(new Error('boom'))).toBeNull();
    expect(errorCodeOf({ code: 'unknown' })).toBeNull();
    expect(errorCodeOf(undefined)).toBeNull();
  });
});

describe('isMeetingTypeNotFound', () => {
  it('узнаёт финальный 404 по коду', () => {
    expect(isMeetingTypeNotFound({ code: 'meeting_type_not_found', message: 'ignored' })).toBe(
      true,
    );
    expect(isMeetingTypeNotFound({ code: 'slot_taken', message: 'ignored' })).toBe(false);
    expect(isMeetingTypeNotFound(new Error('boom'))).toBe(false);
  });
});

describe('isConflictCode', () => {
  // 409 codes mean the picked slot is gone or unusable — the guest needs another slot.
  it('относит к конфликтам коды слотов', () => {
    expect(isConflictCode('slot_taken')).toBe(true);
    expect(isConflictCode('outside_window')).toBe(true);
    expect(isConflictCode('outside_schedule')).toBe(true);
    expect(isConflictCode('validation_failed')).toBe(false);
    expect(isConflictCode('meeting_type_not_found')).toBe(false);
  });
});
