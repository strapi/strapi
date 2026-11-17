import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { createEngine } from '../../engine/better-auth/create-engine';
import type { StartupInputs } from '../../engine/startup-inputs';
import engineService from '../engine';

const reload = vi.fn<(inputs: StartupInputs) => Promise<void>>().mockResolvedValue(undefined);

vi.mock('../../engine/better-auth/create-engine', () => ({
  createEngine: vi.fn(() => ({ reload })),
}));

describe('turning email verification on or off', () => {
  const settings = { signUp: { requireEmailVerification: false } };
  const strapi = {
    log: { error: vi.fn() },
    plugin: () => ({
      service: () => ({
        get: async () => structuredClone(settings),
        // The provider service always reports its secrets, as the real one does
        options: async () => ({
          socialProviders: {},
          genericOAuth: [],
          trustedProviders: [],
          secrets: { fields: [], values: [] },
        }),
      }),
    }),
  } as unknown as Core.Strapi;

  beforeEach(() => {
    settings.signUp.requireEmailVerification = false;
    reload.mockClear();
    vi.mocked(createEngine).mockClear();
  });

  it('rebuilds the engine once, on the next request, with no restart', async () => {
    const service = engineService({ strapi });

    await service.ensureCurrent();
    expect(reload).not.toHaveBeenCalled();

    settings.signUp.requireEmailVerification = true;

    await service.ensureCurrent();
    await service.ensureCurrent();

    expect(reload).toHaveBeenCalledTimes(1);
    expect(reload.mock.calls[0][0]).toMatchObject({ requireEmailVerification: true });

    settings.signUp.requireEmailVerification = false;
    await service.ensureCurrent();

    expect(reload).toHaveBeenCalledTimes(2);
    expect(reload.mock.calls[1][0]).toMatchObject({ requireEmailVerification: false });
  });
});
