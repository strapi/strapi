import type { Core } from '@strapi/types';
import { describe, expect, it, vi } from 'vitest';

import { bootstrapCheckMode, registerCheckMode } from '../check-mode';

const makeStrapi = () => {
  const built = vi.fn();
  const makeRegistry = (uids: string[]) => {
    const store = Object.fromEntries(uids.map((uid) => [uid, { uid }]));

    return {
      get(uid: string) {
        return store[uid];
      },
      keys() {
        return Object.keys(store);
      },
      // As the controllers' registry answers: each entry is built when it is read
      getAll(namespace?: string) {
        const map = {};

        for (const uid of Object.keys(store).filter(
          (key) => !namespace || key.startsWith(namespace)
        )) {
          Object.defineProperty(map, uid, {
            enumerable: true,
            get() {
              built(uid);

              return store[uid];
            },
          });
        }

        return map;
      },
    };
  };
  const registries: Record<string, ReturnType<typeof makeRegistry>> = {
    'content-types': makeRegistry([
      'plugin::end-users.role',
      'plugin::end-users.profile',
      'api::memo.memo',
    ]),
    controllers: makeRegistry(['plugin::end-users.profile', 'plugin::end-users.migration']),
    services: makeRegistry(['plugin::end-users.engine', 'plugin::end-users.migration']),
  };
  const plugin = {
    routes: {
      admin: { type: 'admin', routes: [{ method: 'GET', path: '/roles', handler: 'role.find' }] },
      'content-api': { type: 'content-api', routes: [{ method: 'POST', path: '/auth/local' }] },
    } as Record<string, unknown>,
  };
  const register = vi.fn();
  const registerMany = vi.fn();
  const strapi = {
    hook: vi.fn(() => ({ register })),
    get: vi.fn((name: string) => registries[name]),
    plugin: vi.fn(() => plugin),
    service: vi.fn(() => ({ actionProvider: { registerMany } })),
    documents: { use: vi.fn() },
    auth: { register: vi.fn() },
    server: { use: vi.fn() },
    validators: { add: vi.fn() },
    contentAPI: { addQueryParams: vi.fn() },
  };

  return {
    strapi: strapi as unknown as Core.Strapi,
    raw: strapi,
    registries,
    built,
    plugin,
    registerMany,
  };
};

describe('check mode', () => {
  it('registers nothing in check mode but the migration routes and two admin actions', async () => {
    const { strapi, raw, registries, built, plugin, registerMany } = makeStrapi();
    const registry = registries['content-types'];

    registerCheckMode(strapi);

    // the start control, which refuses check mode without Users & Permissions
    expect(raw.hook).toHaveBeenCalledWith('strapi::content-types.beforeSync');

    // no middleware, strategy, validator or query parameter
    expect(raw.documents.use).not.toHaveBeenCalled();
    expect(raw.auth.register).not.toHaveBeenCalled();
    expect(raw.server.use).not.toHaveBeenCalled();
    expect(raw.validators.add).not.toHaveBeenCalled();
    expect(raw.contentAPI.addQueryParams).not.toHaveBeenCalled();

    // the plugin's own types are no longer the registry's to answer, the project's still are
    expect(registry.keys()).toEqual(['api::memo.memo']);
    expect(registry.get('plugin::end-users.role')).toBeUndefined();
    expect(Object.keys(registry.getAll())).toEqual(['api::memo.memo']);
    expect(Object.keys(registry.getAll('plugin::end-users'))).toEqual([]);

    // only the migration's controller and service are left, and nothing was built to find out
    expect(registries.controllers.keys()).toEqual(['plugin::end-users.migration']);
    expect(registries.services.keys()).toEqual(['plugin::end-users.migration']);
    expect(Object.keys(registries.controllers.getAll('plugin::end-users'))).toEqual([
      'plugin::end-users.migration',
    ]);
    expect(built).not.toHaveBeenCalled();

    // five routes, all admin
    const routes = plugin.routes as { admin: { routes: Array<{ method: string; path: string }> } };

    expect(Object.keys(plugin.routes)).toEqual(['admin']);
    expect(routes.admin.routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      'GET /migration',
      'PUT /migration/items/:id',
      'POST /migration/check',
      'GET /migration/files',
      'POST /migration/files',
    ]);

    await bootstrapCheckMode(strapi);

    expect(registerMany).toHaveBeenCalledTimes(1);
    expect(registerMany.mock.calls[0][0].map((action: { uid: string }) => action.uid)).toEqual([
      'settings.read',
      'settings.update',
    ]);
  });
});
