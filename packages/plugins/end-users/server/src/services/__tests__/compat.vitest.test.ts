import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import compatService, { FLUSH_INTERVAL_MS } from '../compat';

const setup = (stored: unknown = null) => {
  let value = stored;
  const get = vi.fn(async () => value);
  const set = vi.fn(async ({ value: next }: { value: unknown }) => {
    value = next;
  });
  const warn = vi.fn();
  const strapi = {
    store: vi.fn(() => ({ get, set })),
    log: { warn },
  } as unknown as Core.Strapi;

  return { service: compatService({ strapi }), get, set, warn };
};

describe('compat service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads zero counts and no last hit when nothing was recorded', async () => {
    const { service } = setup();

    expect(await service.legacyJwtHits()).toEqual({ legacy: 0, access: 0, lastHitAt: null });
  });

  it('records a hit per kind, flushes at most once a minute and at destroy, and stores no token or user', async () => {
    const { service, set } = setup();

    service.recordLegacyHit('legacy');
    await service.flush();
    expect(set).toHaveBeenCalledTimes(1);

    // Inside the minute: counted, not written
    service.recordLegacyHit('legacy');
    service.recordLegacyHit('access');
    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS - 1000);
    service.recordLegacyHit('access');
    expect(set).toHaveBeenCalledTimes(1);
    expect(await service.legacyJwtHits()).toMatchObject({ legacy: 2, access: 2 });

    // The first hit after the minute writes what is waiting
    await vi.advanceTimersByTimeAsync(1000);
    service.recordLegacyHit('legacy');
    await service.flush();
    expect(set).toHaveBeenCalledTimes(2);

    // Destroy writes the rest
    service.recordLegacyHit('access');
    await service.flush();
    expect(set).toHaveBeenCalledTimes(3);

    const written = set.mock.calls.map(([call]) => call.value);

    expect(written.at(-1)).toEqual({
      legacy: 3,
      access: 3,
      lastHitAt: new Date(Date.now()).toISOString(),
    });
    for (const value of written) {
      expect(Object.keys(value as object).sort((a, b) => a.localeCompare(b))).toEqual([
        'access',
        'lastHitAt',
        'legacy',
      ]);
    }
  });

  it('adds to the stored totals, so a restart does not reset them', async () => {
    const { service } = setup({ legacy: 10, access: 4, lastHitAt: '2026-01-01T00:00:00.000Z' });

    service.recordLegacyHit('access');

    expect(await service.legacyJwtHits()).toEqual({
      legacy: 10,
      access: 5,
      lastHitAt: '2026-06-01T12:00:00.000Z',
    });

    await service.flush();

    expect(await service.legacyJwtHits()).toMatchObject({ legacy: 10, access: 5 });
  });

  it('keeps the hits when a write fails and counts them in the next one', async () => {
    const { service, set, warn } = setup();

    set.mockRejectedValueOnce(new Error('db down'));
    service.recordLegacyHit('legacy');
    await service.flush();

    expect(warn).toHaveBeenCalled();
    expect(await service.legacyJwtHits()).toMatchObject({ legacy: 1 });

    await service.flush();

    expect(set).toHaveBeenLastCalledWith({
      key: 'legacyJwtHits',
      value: expect.objectContaining({ legacy: 1 }),
    });
  });

  it('forgets the cached migration record on request', async () => {
    const { get } = setup({ status: 'completed', cutoverAt: '2026-07-01T00:00:00.000Z' });
    const { readLegacyCutover } = await import('../../compat/legacy-jwt');
    const strapi = { store: () => ({ get }), log: { warn: vi.fn() } } as unknown as Core.Strapi;
    const own = compatService({ strapi });

    await readLegacyCutover(strapi);
    await readLegacyCutover(strapi);
    expect(get).toHaveBeenCalledTimes(1);

    own.clearCutoverCache();
    await readLegacyCutover(strapi);
    expect(get).toHaveBeenCalledTimes(2);
  });
});
