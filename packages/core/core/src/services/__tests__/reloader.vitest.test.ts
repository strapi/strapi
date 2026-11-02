import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Core } from '@strapi/types';

import { createReloader } from '../reloader';

const createStrapi = () =>
  ({
    config: { get: vi.fn((key: string) => key === 'autoReload') },
  }) as unknown as Core.Strapi;

describe('reloader', () => {
  const originalSend = process.send;
  let send: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    send = vi.fn();
    process.send = send as unknown as typeof process.send;
  });

  afterEach(() => {
    process.send = originalSend;
  });

  it('sends a reload message to the parent process', () => {
    const reload = createReloader(createStrapi());

    reload();

    expect(send).toHaveBeenCalledWith('reload');
  });

  it('skips the next reload when watching is set back to true', () => {
    const reload = createReloader(createStrapi());

    reload.isWatching = false;
    reload.isWatching = true;
    reload();

    expect(send).not.toHaveBeenCalled();

    reload();

    expect(send).toHaveBeenCalledTimes(1);
  });

  describe('resumeWatching', () => {
    it('turns watching back on', () => {
      const reload = createReloader(createStrapi());

      reload.isWatching = false;
      reload.resumeWatching();

      expect(reload.isWatching).toBe(true);
    });

    it('does not skip the next reload', () => {
      const reload = createReloader(createStrapi());

      // A refused write turns watching off, then back on
      reload.isWatching = false;
      reload.resumeWatching();

      // The next accepted write turns watching off, then reloads
      reload.isWatching = false;
      reload();

      expect(send).toHaveBeenCalledWith('reload');
    });
  });
});
