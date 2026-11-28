import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import policies from '../index';
import { isDevelopment } from '../is-development';

/** What a policy is given besides the request: `{ strapi }`, whose config says if `autoReload` is on */
const strapiWith = (autoReload: unknown) =>
  ({
    config: {
      get: vi.fn((key: string, fallback?: unknown) =>
        key === 'autoReload' ? autoReload : fallback
      ),
    },
  }) as unknown as Core.Strapi;

const run = (autoReload: unknown) =>
  isDevelopment.handler({ state: {} }, undefined, { strapi: strapiWith(autoReload) });

describe('plugin::end-users.is-development', () => {
  it('is the plugin`s policy of that name', () => {
    expect(policies['is-development']).toBe(isDevelopment);
    expect(isDevelopment.name).toBe('plugin::end-users.is-development');
  });

  it('passes when Strapi runs with autoReload', () => {
    expect(run(true)).toBe(true);
  });

  it('refuses without autoReload, as a policy error that says why', () => {
    expect(() => run(false)).toThrow(
      expect.objectContaining({
        name: 'PolicyError',
        details: { code: 'DEVELOPMENT_ONLY' },
      })
    );
    // Nothing set, and anything that is not `true`
    expect(() => run(undefined)).toThrow(expect.objectContaining({ name: 'PolicyError' }));
    expect(() => run('true')).toThrow(expect.objectContaining({ name: 'PolicyError' }));
    expect(() => run(1)).toThrow(expect.objectContaining({ name: 'PolicyError' }));
  });

  it('reads the setting with a default of off', () => {
    const strapi = strapiWith(undefined);

    expect(() => isDevelopment.handler({ state: {} }, undefined, { strapi })).toThrow();
    expect(strapi.config.get).toHaveBeenCalledWith('autoReload', false);
  });
});
