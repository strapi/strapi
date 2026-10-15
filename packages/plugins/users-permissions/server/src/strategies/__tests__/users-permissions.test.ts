import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from 'koa';

import createStrategy from '../users-permissions';
import { createStrapiMock } from '../../../tests/utils';

const createFixture = () => {
  const user = { id: 1, confirmed: true, blocked: false, role: { id: 2 } };
  const permissions = [{ action: 'article.find' }, { action: 'article.findOne' }];
  const toContentAPIPermission = vi.fn((permission: { action: string }) => ({
    ...permission,
    subject: null,
  }));
  const ability = { can: vi.fn<(action: string) => boolean>().mockReturnValue(true) };
  const generateAbility = vi.fn().mockResolvedValue(ability);
  const services = {
    jwt: { getToken: vi.fn().mockResolvedValue({ id: user.id }) },
    user: { fetchAuthenticatedUser: vi.fn().mockResolvedValue(user) },
    permission: {
      findRolePermissions: vi.fn().mockResolvedValue(permissions),
      findPublicPermissions: vi.fn().mockResolvedValue(permissions),
      toContentAPIPermission,
    },
  };
  const strapi = createStrapiMock({
    plugin: () => ({ service: (name: keyof typeof services) => services[name] }),
    store: () => ({ get: vi.fn().mockResolvedValue({ email_confirmation: true }) }),
    contentAPI: { permissions: { engine: { generateAbility } } },
  });
  const ctx = { state: {} } as Context;
  return {
    strategy: createStrategy({ strapi }),
    strapi,
    user,
    permissions,
    services,
    ability,
    generateAbility,
    ctx,
  };
};

beforeEach(() => {
  vi.stubGlobal('strapi', {
    plugin() {
      throw new Error('Global Strapi must not be used');
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('users-permissions strategy', () => {
  it.each([false, true])(
    'passes only the permission to the mapper (authenticated: %s)',
    async (authenticated) => {
      const { strategy, services, user, permissions, ability, generateAbility, ctx } =
        createFixture();
      services.jwt.getToken.mockResolvedValue(authenticated ? { id: user.id } : null);
      await expect(strategy.authenticate(ctx)).resolves.toEqual({
        authenticated: true,
        credentials: authenticated ? user : null,
        ability,
      });
      expect(services.permission.toContentAPIPermission.mock.calls).toEqual(
        permissions.map((permission) => [permission])
      );
      expect(generateAbility).toHaveBeenCalledWith(
        permissions.map((permission) => ({ ...permission, subject: null }))
      );
    }
  );

  it('exposes the authenticated user and current session', async () => {
    const { strategy, services, user, ctx } = createFixture();
    services.jwt.getToken.mockResolvedValue({ id: user.id, sessionId: 'current-session' });
    await strategy.authenticate(ctx);
    expect(ctx.state).toEqual({ user, session: { id: 'current-session' } });
  });

  it.each([{ scope: 'article.find' }, { scope: ['article.find', 'article.findOne'] }])(
    'checks every requested scope: %s',
    async ({ scope }) => {
      const { strategy, ability } = createFixture();
      await expect(strategy.verify({ ability }, { scope })).resolves.toBeUndefined();
      const scopes = Array.isArray(scope) ? scope : [scope];
      expect(ability.can.mock.calls).toEqual(scopes.map((action) => [action]));
    }
  );

  it('rejects a scope array when any action is forbidden', async () => {
    const { strategy, ability } = createFixture();
    ability.can.mockImplementation((action) => action === 'article.find');
    await expect(
      strategy.verify({ ability }, { scope: ['article.find', 'article.delete'] })
    ).rejects.toThrow('Forbidden');
  });

  it('checks sparse scope entries instead of skipping authorization', async () => {
    const { strategy, ability } = createFixture();
    ability.can.mockReturnValue(false);
    await expect(strategy.verify({ ability }, { scope: Array<string>(1) })).rejects.toThrow(
      'Forbidden'
    );
    expect(ability.can).toHaveBeenCalledWith(undefined);
  });

  it.each([
    { credentials: null },
    { credentials: undefined },
    { credentials: { id: 1 }, scope: 'article.find' },
  ])('rejects missing authentication: %s', async ({ credentials, scope }) => {
    const { strategy } = createFixture();
    await expect(strategy.verify({ credentials }, { scope })).rejects.toThrow('Unauthorized');
  });

  it('allows authenticated users on routes without scopes', async () => {
    const { strategy } = createFixture();
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
      const { strategy, services, generateAbility, ctx } = createFixture();
      services.jwt.getToken.mockResolvedValue(token);
      services.user.fetchAuthenticatedUser.mockResolvedValue(user);
      services.permission.findPublicPermissions.mockResolvedValue([]);
      await expect(strategy.authenticate(ctx)).resolves.toEqual(expected);
      expect(ctx.state).toEqual({});
      expect(generateAbility).not.toHaveBeenCalled();
    }
  );

  it('does not authenticate when token verification throws', async () => {
    const { strategy, services, ctx } = createFixture();
    services.jwt.getToken.mockRejectedValue(new Error('expired'));
    await expect(strategy.authenticate(ctx)).resolves.toEqual({ authenticated: false });
  });
});
