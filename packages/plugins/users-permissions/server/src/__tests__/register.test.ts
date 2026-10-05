import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Context } from 'koa';
import register from '../register';
import { createStrapiMock } from '../../tests/utils';

afterEach(() => vi.unstubAllGlobals());

describe('users-permissions registration', () => {
  it('registers an authentication strategy bound to the supplied instance', async () => {
    vi.stubGlobal('strapi', undefined);
    const registerAuth = vi.fn();
    const addSanitizer = vi.fn();
    const getToken = vi.fn().mockResolvedValue(null);
    const strapi = createStrapiMock({
      get: () => ({ register: registerAuth }),
      sanitizers: { add: addSanitizer },
      plugin: (name: string) =>
        name === 'users-permissions'
          ? {
              service: (service: string) =>
                service === 'jwt' ? { getToken } : { findPublicPermissions: async () => [] },
            }
          : undefined,
    });

    register({ strapi });

    expect(registerAuth).toHaveBeenCalledWith(
      'content-api',
      expect.objectContaining({ name: 'users-permissions' })
    );
    expect(addSanitizer).toHaveBeenCalledWith('content-api.output', expect.any(Function));
    const strategy = registerAuth.mock.calls[0][1];
    await expect(strategy.authenticate({ state: {} } as Context)).resolves.toEqual({
      authenticated: false,
    });
    expect(getToken).toHaveBeenCalledOnce();
  });

  it('registers the shipped documentation override when the plugin is installed', () => {
    const registerOverride = vi.fn();
    const strapi = createStrapiMock({
      get: () => ({ register: vi.fn() }),
      sanitizers: { add: vi.fn() },
      plugin: (name: string) =>
        name === 'documentation' ? { service: () => ({ registerOverride }) } : undefined,
    });

    register({ strapi });

    expect(registerOverride).toHaveBeenCalledWith(expect.stringContaining('/auth/local:'), {
      pluginOrigin: 'users-permissions',
      excludeFromGeneration: ['users-permissions'],
    });
  });
});
