import { describe, expect, it } from 'vitest';
import { messages, t } from '../../../server/shared/i18n/index.js';

// The catalog is served to the client as-is, so a forgotten or blank key must
// fail here rather than surface as an empty label in the UI (ADR 0007).
function leaves(node: Record<string, unknown>, prefix = ''): [string, unknown][] {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'object' && value !== null
      ? leaves(value as Record<string, unknown>, path)
      : [[path, value] as [string, unknown]];
  });
}

describe('t', () => {
  it('возвращает сообщение по dot-пути', () => {
    expect(t('common.appName')).toBe('Календарь звонков');
  });

  it('подставляет параметры в {name}-плейсхолдеры', () => {
    expect(t('common.duration', { minutes: 30 })).toBe('30 мин');
    expect(t('booking.wizard.stepCounter', { step: 2, total: 3 })).toBe('Шаг 2 из 3');
  });

  it('падает, если параметр не передан', () => {
    expect(() => t('common.duration')).toThrow(/minutes/);
  });

  it('падает на неизвестном ключе', () => {
    // The path type rejects this at compile time; the guard covers untyped callers.
    expect(() => t('common.missing' as never)).toThrow(/Unknown message key/);
  });
});

describe('каталог', () => {
  it('не содержит пустых строк', () => {
    for (const [path, value] of leaves(messages)) {
      expect(typeof value, `${path} — строка`).toBe('string');
      expect((value as string).trim(), `${path} не пустой`).not.toBe('');
    }
  });
});
