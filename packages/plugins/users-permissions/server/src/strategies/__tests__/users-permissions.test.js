import { afterEach, describe, expect, it, vi } from 'vitest';

import strategy from '../users-permissions';

describe('users-permissions strategy', () => {
  const previousStrapi = global.strapi;

  afterEach(() => {
    global.strapi = previousStrapi ?? {};
    vi.clearAllMocks();
  });

  it.each([false, true])(
    'passes only the permission to the mapper (authenticated: %s)',
    async (authenticated) => {
      const permissions = [{ action: 'article.find' }, { action: 'article.findOne' }];
      const toContentAPIPermission = vi.fn((permission) => ({ ...permission, subject: null }));
      const ability = { can: vi.fn() };
      const generateAbility = vi.fn().mockResolvedValue(ability);
      const user = { id: 1, confirmed: true, blocked: false, role: { id: 2 } };
      const services = {
        jwt: { getToken: vi.fn().mockResolvedValue(authenticated ? { id: user.id } : null) },
        user: { fetchAuthenticatedUser: vi.fn().mockResolvedValue(user) },
        permission: {
          findRolePermissions: vi.fn().mockResolvedValue(permissions),
          findPublicPermissions: vi.fn().mockResolvedValue(permissions),
          toContentAPIPermission,
        },
      };
      global.strapi = {
        plugin: () => ({ service: (name) => services[name] }),
        store: () => ({ get: vi.fn().mockResolvedValue({ email_confirmation: true }) }),
        contentAPI: { permissions: { engine: { generateAbility } } },
      };
      const ctx = { state: {} };

      const result = await strategy.authenticate(ctx);

      expect(result).toEqual({
        authenticated: true,
        credentials: authenticated ? user : null,
        ability,
      });
      expect(toContentAPIPermission.mock.calls).toEqual(
        permissions.map((permission) => [permission])
      );
      expect(generateAbility).toHaveBeenCalledWith(
        permissions.map((permission) => ({ ...permission, subject: null }))
      );
    }
  );

  it.each([{ scope: 'article.find' }, { scope: ['article.find', 'article.findOne'] }])(
    'checks every requested scope: %s',
    async ({ scope }) => {
      const can = vi.fn().mockReturnValue(true);

      await expect(strategy.verify({ ability: { can } }, { scope })).resolves.toBeUndefined();

      const scopes = Array.isArray(scope) ? scope : [scope];
      expect(can.mock.calls).toEqual(scopes.map((action) => [action]));
    }
  );

  it('rejects a scope array when any action is forbidden', async () => {
    const can = vi.fn((action) => action === 'article.find');

    await expect(
      strategy.verify({ ability: { can } }, { scope: ['article.find', 'article.delete'] })
    ).rejects.toThrow('Forbidden');
  });

  it('checks sparse scope entries instead of skipping authorization', async () => {
    const can = vi.fn().mockReturnValue(false);

    await expect(strategy.verify({ ability: { can } }, { scope: Array(1) })).rejects.toThrow(
      'Forbidden'
    );

    expect(can).toHaveBeenCalledWith(undefined);
  });

  it.each([
    { credentials: null },
    { credentials: undefined },
    { credentials: { id: 1 }, scope: 'article.find' },
  ])('rejects missing authentication: %s', async ({ credentials, scope }) => {
    await expect(strategy.verify({ credentials }, { scope })).rejects.toThrow('Unauthorized');
  });

  it('allows authenticated users on routes without scopes', async () => {
    await expect(strategy.verify({ credentials: { id: 1 } }, {})).resolves.toBeUndefined();
  });

  it.each([
    { token: {}, user: null, expected: { authenticated: false } },
    { token: { id: 1 }, user: null, expected: { error: 'Invalid credentials' } },
    { token: { id: 1 }, user: { confirmed: false }, expected: { error: 'Invalid credentials' } },
    {
      token: { id: 1 },
      user: { confirmed: true, blocked: true },
      expected: { error: 'Invalid credentials' },
    },
    { token: null, user: null, expected: { authenticated: false } },
  ])(
    'rejects invalid credentials or missing public permissions: %s',
    async ({ token, user, expected }) => {
      const generateAbility = vi.fn();
      const services = {
        jwt: { getToken: vi.fn().mockResolvedValue(token) },
        user: { fetchAuthenticatedUser: vi.fn().mockResolvedValue(user) },
        permission: { findPublicPermissions: vi.fn().mockResolvedValue([]) },
      };
      global.strapi = {
        plugin: () => ({ service: (name) => services[name] }),
        store: () => ({ get: vi.fn().mockResolvedValue({ email_confirmation: true }) }),
        contentAPI: { permissions: { engine: { generateAbility } } },
      };
      const ctx = { state: {} };

      await expect(strategy.authenticate(ctx)).resolves.toEqual(expected);
      expect(ctx.state).toEqual({});
      expect(generateAbility).not.toHaveBeenCalled();
    }
  );

  it('does not authenticate when token verification throws', async () => {
    global.strapi = {
      plugin: () => ({
        service: () => ({ getToken: vi.fn().mockRejectedValue(new Error('expired')) }),
      }),
    };
    await expect(strategy.authenticate({ state: {} })).resolves.toEqual({ authenticated: false });
  });
});
