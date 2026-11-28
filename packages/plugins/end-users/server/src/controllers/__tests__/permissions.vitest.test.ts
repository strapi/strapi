import { describe, expect, it, vi } from 'vitest';
import { errors } from '@strapi/utils';
import type Koa from 'koa';
import type { Core } from '@strapi/types';

import permissionsController from '../permissions';
import permissionsRoutes from '../../routes/content-api/permissions';

const DESCRIBED = {
  roles: [{ documentId: 'role-public', name: 'Public', type: 'public' }],
  routes: [],
  subjects: {},
};

const setup = (compat = false) => {
  const describeCaller = vi.fn(async () => DESCRIBED);
  const service = vi.fn(() => ({ describe: describeCaller }));
  const plugin = vi.fn(() => ({ service }));
  const strapi = {
    plugin,
    config: {
      get: (path: string) => (path.endsWith('compat.usersPermissions') ? compat : undefined),
    },
  } as unknown as Core.Strapi;

  const ctxWith = (auth: unknown) => {
    // Koa's `ctx.set(field, value)`, keeping what was set so a test can read the headers
    const headers: Record<string, string> = {};

    return {
      state: { auth },
      body: undefined,
      response: { headers },
      set: vi.fn((field: string, value: string) => {
        headers[field.toLowerCase()] = value;
      }),
    } as unknown as Koa.Context;
  };

  return {
    permissions: permissionsController({ strapi }),
    describeCaller,
    service,
    plugin,
    ctxWith,
  };
};

describe('permissions controller', () => {
  it('answers what the caller holds, from the auth the strategy put on the request', async () => {
    const { permissions, describeCaller, plugin, service, ctxWith } = setup();
    const auth = { strategy: { name: 'end-users' }, credentials: null, ability: {} };
    const ctx = ctxWith(auth);

    await permissions.forCaller(ctx);

    expect(plugin).toHaveBeenCalledWith('end-users');
    expect(service).toHaveBeenCalledWith('ability');
    expect(describeCaller).toHaveBeenCalledWith(auth);
    expect(ctx.body).toEqual({ data: DESCRIBED });
  });

  it('tells every cache not to keep the answer: it is the caller`s own', async () => {
    const { permissions, ctxWith } = setup();
    const ctx = ctxWith({ strategy: { name: 'end-users' }, credentials: null, ability: {} });

    await permissions.forCaller(ctx);

    expect((ctx.response as { headers: Record<string, string> }).headers['cache-control']).toBe(
      'private, no-store'
    );
  });

  it.each([
    ['an API token', { strategy: { name: 'api-token' }, credentials: { id: 1 }, ability: {} }],
    ['no auth', undefined],
  ])('refuses %s with 403', async (_label, auth) => {
    const { permissions, describeCaller, ctxWith } = setup();

    await expect(permissions.forCaller(ctxWith(auth))).rejects.toBeInstanceOf(
      errors.ForbiddenError
    );
    expect(describeCaller).not.toHaveBeenCalled();
  });

  it('answers the strategy under its users-permissions name only with compat on', async () => {
    const auth = { strategy: { name: 'users-permissions' }, credentials: null, ability: {} };
    const on = setup(true);

    await on.permissions.forCaller(on.ctxWith(auth));
    expect(on.describeCaller).toHaveBeenCalledWith(auth);

    const off = setup(false);

    await expect(off.permissions.forCaller(off.ctxWith(auth))).rejects.toBeInstanceOf(
      errors.ForbiddenError
    );
  });

  it('is GET /permissions/me under the plugin prefix, with the default scope', () => {
    expect(permissionsRoutes).toEqual([
      { method: 'GET', path: '/permissions/me', handler: 'permissions.forCaller' },
    ]);
  });
});
