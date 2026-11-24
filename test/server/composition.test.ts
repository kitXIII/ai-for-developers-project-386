import { describe, expect, it } from 'vitest';
import { buildApp } from '../../server/app.js';
import { composeDependencies } from '../../server/composition.js';
import { SEED_MEETING_TYPE } from './fixtures.js';

// The composition root (ADR 0006/0011) receives the storage explicitly: PGlite
// is the local profile, Postgres the production one, and there is no third
// option and no default.
describe('composeDependencies на PGlite', () => {
  it('поднимает пустое хранилище и отдаёт его порты сценариям', async () => {
    const deps = await composeDependencies({ database: { kind: 'pglite' } });

    try {
      const meetingType = await deps.meetingTypes.create(SEED_MEETING_TYPE);

      expect(meetingType.id).not.toBe('');
      expect(await deps.meetingTypes.list()).toEqual([meetingType]);
    } finally {
      await deps.close();
    }
  });

  it('проверяет соединение и закрывается идемпотентно', async () => {
    const deps = await composeDependencies({ database: { kind: 'pglite' } });

    await expect(deps.checkConnection()).resolves.toBeUndefined();
    await expect(deps.close()).resolves.toBeUndefined();
    await expect(deps.close()).resolves.toBeUndefined();
  });
});

describe('composeDependencies с недоступным Postgres', () => {
  // Port 1 refuses connections immediately, so the test does not need a real
  // Postgres: it only proves the pool is created, the check is real and the
  // pool closes idempotently.
  const unreachable = 'postgres://127.0.0.1:1/calendar';

  it('проверяет соединение и падает, если БД недоступна', async () => {
    const deps = await composeDependencies({ database: { kind: 'postgres', url: unreachable } });

    await expect(deps.checkConnection()).rejects.toThrow();
    await expect(deps.close()).resolves.toBeUndefined();
    await expect(deps.close()).resolves.toBeUndefined();
  });
});

describe('buildApp с недоступной БД', () => {
  it('падает до listen', async () => {
    const unreachable = 'postgres://127.0.0.1:1/calendar';

    await expect(
      buildApp({
        serveClient: false,
        logger: false,
        database: { kind: 'postgres', url: unreachable },
      }),
    ).rejects.toThrow();
  });
});
