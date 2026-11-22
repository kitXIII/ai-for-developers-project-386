import { describe, expect, it } from 'vitest';
import { buildApp } from '../../server/app.js';
import { composeDependencies } from '../../server/composition.js';
import { SEED_MEETING_TYPE } from './fixtures.js';

// The composition root (ADR 0006/0008) is the only place that picks concrete
// adapters: without `DATABASE_URL` the app keeps the in-memory ones, so every
// existing deployment and test stays database-free.
describe('composeDependencies без DATABASE_URL', () => {
  it('собирает in-memory адаптеры: типы и брони живут в процессе', async () => {
    const deps = composeDependencies();

    const meetingType = await deps.meetingTypes.create(SEED_MEETING_TYPE);
    expect(meetingType.id).not.toBe('');

    expect(await deps.meetingTypes.list()).toEqual([meetingType]);
  });

  it('пустая строка эквивалентна отсутствию DATABASE_URL', async () => {
    const deps = composeDependencies({ databaseUrl: '' });

    const meetingType = await deps.meetingTypes.create(SEED_MEETING_TYPE);

    expect(await deps.meetingTypes.list()).toEqual([meetingType]);
  });

  it('проверка соединения — no-op, close идемпотентен', async () => {
    const deps = composeDependencies();

    await expect(deps.checkConnection()).resolves.toBeUndefined();
    await expect(deps.close()).resolves.toBeUndefined();
    await expect(deps.close()).resolves.toBeUndefined();
  });
});

describe('composeDependencies с DATABASE_URL', () => {
  // Port 1 refuses connections immediately, so the test does not need a real
  // Postgres: it only proves the pool is created, the check is real and the
  // pool closes idempotently.
  const unreachable = 'postgres://127.0.0.1:1/calendar';

  it('проверяет соединение и падает, если БД недоступна', async () => {
    const deps = composeDependencies({ databaseUrl: unreachable });

    await expect(deps.checkConnection()).rejects.toThrow();
    await expect(deps.close()).resolves.toBeUndefined();
    await expect(deps.close()).resolves.toBeUndefined();
  });
});

describe('buildApp с недоступной БД', () => {
  it('падает до listen', async () => {
    const unreachable = 'postgres://127.0.0.1:1/calendar';

    await expect(
      buildApp({ serveClient: false, logger: false, databaseUrl: unreachable }),
    ).rejects.toThrow();
  });
});
