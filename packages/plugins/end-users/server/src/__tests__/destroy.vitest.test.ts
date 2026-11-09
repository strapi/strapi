import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import destroy, { FLUSH_TIMEOUT_MS } from '../destroy';

const strapiWith = (service: () => unknown) => {
  const warn = vi.fn();
  const strapi = {
    plugin: vi.fn(() => ({ service })),
    log: { warn },
  } as unknown as Core.Strapi;

  return { strapi, warn };
};

describe('destroy', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes the waiting hit counts', async () => {
    const flush = vi.fn(async () => undefined);
    const { strapi, warn } = strapiWith(() => ({ flush }));

    await destroy({ strapi });

    expect(flush).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not throw when the service is not there or the write fails', async () => {
    const missing = strapiWith(() => {
      throw new Error('no such service');
    });

    await expect(destroy({ strapi: missing.strapi })).resolves.toBeUndefined();
    expect(missing.warn).toHaveBeenCalled();

    const failing = strapiWith(() => ({
      async flush() {
        throw new Error('db down');
      },
    }));

    await expect(destroy({ strapi: failing.strapi })).resolves.toBeUndefined();
    expect(failing.warn).toHaveBeenCalled();
  });

  it('stops waiting for a write that hangs', async () => {
    vi.useFakeTimers();

    const { strapi, warn } = strapiWith(() => ({
      flush: () =>
        new Promise<void>(() => {
          // never settles
        }),
    }));
    const done = destroy({ strapi });

    await vi.advanceTimersByTimeAsync(FLUSH_TIMEOUT_MS);
    await expect(done).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});
