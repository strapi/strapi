import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import plugin from '../../index';
import { createEngine } from '../../engine/better-auth/create-engine';
import { emptyStartupInputs, readStartupInputs } from '../../engine/startup-inputs';
import type { StartupInputs } from '../../engine/startup-inputs';
import { PERMISSIONS_TTL_MS } from '../ability';
import engineService from '../engine';

const reload = vi.fn<(inputs: StartupInputs) => Promise<void>>().mockResolvedValue(undefined);

vi.mock('../../engine/better-auth/create-engine', () => ({
  createEngine: vi.fn(() => ({ schema: vi.fn(), reload })),
}));

vi.mock('../../engine/startup-inputs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../engine/startup-inputs')>()),
  readStartupInputs: vi.fn(),
}));

const verified = (): StartupInputs => ({ ...emptyStartupInputs(), requireEmailVerification: true });

describe('engine service', () => {
  const error = vi.fn();
  const strapi = { log: { error } } as unknown as Core.Strapi;

  beforeEach(() => {
    error.mockClear();
    vi.mocked(createEngine).mockClear();
    reload.mockReset();
    reload.mockResolvedValue(undefined);
    vi.mocked(readStartupInputs).mockReset();
    vi.mocked(readStartupInputs).mockResolvedValue(emptyStartupInputs());
  });

  it('builds the engine from Strapi on first use', () => {
    const service = engineService({ strapi });

    expect(createEngine).not.toHaveBeenCalled();

    service.get();

    expect(createEngine).toHaveBeenCalledTimes(1);
    expect(createEngine).toHaveBeenCalledWith(strapi, undefined, emptyStartupInputs());
  });

  it('does not rebuild on the first request when nothing is configured (I-2)', async () => {
    const service = engineService({ strapi });

    // What `service('provider').options()` answers with nothing configured: the three lists,
    // and the secrets it always reports
    vi.mocked(readStartupInputs).mockResolvedValue({
      requireEmailVerification: false,
      providers: {
        socialProviders: {},
        genericOAuth: [],
        trustedProviders: [],
        secrets: { fields: [], values: [] },
      },
    });

    service.get();
    await service.ensureCurrent();

    expect(reload).not.toHaveBeenCalled();
  });

  it('builds the first engine from the inputs its fingerprint is taken from', async () => {
    const service = engineService({ strapi });

    service.get();

    const [, , built] = vi.mocked(createEngine).mock.calls[0];

    vi.mocked(readStartupInputs).mockResolvedValue(structuredClone(built as StartupInputs));
    await service.ensureCurrent();

    expect(reload).not.toHaveBeenCalled();
  });

  it('keeps one engine for the life of the service', () => {
    const service = engineService({ strapi });

    expect(service.get()).toBe(service.get());
    expect(createEngine).toHaveBeenCalledTimes(1);
  });

  it('is registered with the plugin as `engine`', () => {
    expect(plugin.services.engine).toBe(engineService);
  });

  describe('ensureCurrent', () => {
    it('rebuilds once when the inputs changed, and not otherwise', async () => {
      const service = engineService({ strapi });

      await service.ensureCurrent();
      expect(reload).not.toHaveBeenCalled();

      vi.mocked(readStartupInputs).mockResolvedValue(verified());

      await service.ensureCurrent();
      await service.ensureCurrent();

      expect(reload).toHaveBeenCalledTimes(1);
      expect(reload).toHaveBeenCalledWith(verified());
    });

    it('shares a rebuild with the requests that arrive during it', async () => {
      const service = engineService({ strapi });
      let finish: () => void = () => undefined;

      vi.mocked(readStartupInputs).mockResolvedValue(verified());
      reload.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          })
      );

      let settled = 0;
      const calls = [service.ensureCurrent(), service.ensureCurrent(), service.ensureCurrent()].map(
        (call) =>
          call.then(() => {
            settled += 1;
          })
      );

      await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
      await Promise.resolve();

      expect(settled).toBe(0);

      finish();
      await Promise.all(calls);

      expect(settled).toBe(3);
      expect(reload).toHaveBeenCalledTimes(1);
      expect(readStartupInputs).toHaveBeenCalledTimes(1);
    });

    describe('after a failed rebuild', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('rejects, and logs an error naming the cause', async () => {
        const service = engineService({ strapi });

        vi.mocked(readStartupInputs).mockResolvedValue(verified());
        reload.mockRejectedValueOnce(new Error('bad provider'));

        await expect(service.ensureCurrent()).rejects.toThrow('bad provider');

        expect(error).toHaveBeenCalledTimes(1);
        expect(error.mock.calls[0][0]).toContain('bad provider');
      });

      it('does not retry the same inputs within 30 seconds, and retries after', async () => {
        const service = engineService({ strapi });

        vi.mocked(readStartupInputs).mockResolvedValue(verified());
        reload.mockRejectedValue(new Error('bad provider'));

        await expect(service.ensureCurrent()).rejects.toThrow('bad provider');

        vi.advanceTimersByTime(PERMISSIONS_TTL_MS - 1);
        await service.ensureCurrent();
        await service.ensureCurrent();

        expect(reload).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(1);
        await expect(service.ensureCurrent()).rejects.toThrow('bad provider');

        expect(reload).toHaveBeenCalledTimes(2);
        expect(error).toHaveBeenCalledTimes(2);
      });

      it('retries at once when the inputs are different ones', async () => {
        const service = engineService({ strapi });

        vi.mocked(readStartupInputs).mockResolvedValue(verified());
        reload.mockRejectedValueOnce(new Error('bad provider'));

        await expect(service.ensureCurrent()).rejects.toThrow('bad provider');

        const other: StartupInputs = {
          ...verified(),
          providers: { ...emptyStartupInputs().providers, trustedProviders: ['github'] },
        };

        vi.mocked(readStartupInputs).mockResolvedValue(other);
        await service.ensureCurrent();

        expect(reload).toHaveBeenCalledTimes(2);
        expect(reload).toHaveBeenLastCalledWith(other);
      });

      it('forgets the failure once a rebuild works', async () => {
        const service = engineService({ strapi });

        vi.mocked(readStartupInputs).mockResolvedValue(verified());
        reload.mockRejectedValueOnce(new Error('bad provider'));

        await expect(service.ensureCurrent()).rejects.toThrow('bad provider');

        await service.reload();
        await service.ensureCurrent();

        expect(reload).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('reload', () => {
    it('waits for a failing rebuild in progress and then rebuilds', async () => {
      const service = engineService({ strapi });
      let fail: (reason: Error) => void = () => undefined;

      vi.mocked(readStartupInputs).mockResolvedValue(verified());
      reload.mockImplementationOnce(
        () =>
          new Promise<void>((_, reject) => {
            fail = reject;
          })
      );

      const inProgress = service.ensureCurrent().catch((caught: Error) => caught.message);
      await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));

      const reloaded = service.reload();
      await Promise.resolve();

      expect(reload).toHaveBeenCalledTimes(1);

      fail(new Error('bad provider'));

      expect(await inProgress).toBe('bad provider');
      await reloaded;

      expect(reload).toHaveBeenCalledTimes(2);
      expect(reload).toHaveBeenLastCalledWith(verified());
    });

    it('rebuilds now, even when the inputs have not changed', async () => {
      const service = engineService({ strapi });

      await service.reload();

      expect(reload).toHaveBeenCalledTimes(1);
      expect(reload).toHaveBeenCalledWith(emptyStartupInputs());
    });
  });
});
