import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PROFILE_UID, USER_UID } from '../../constants';
import usersRoutes, { meRoutes } from '../content-api/users';
import createContentApiRoutes from '../content-api';

// The core router of a content type is the five routes Strapi derives from it; the real one reads
// the content type from the running application, which a unit test does not have
vi.mock('@strapi/strapi', () => ({
  factories: {
    createCoreRouter(uid: string) {
      const name = uid === 'plugin::end-users.user' ? 'users' : 'profiles';

      return {
        routes: [
          { method: 'GET', path: `/${name}`, handler: `${uid}.find`, config: {} },
          { method: 'GET', path: `/${name}/:id`, handler: `${uid}.findOne` },
          { method: 'POST', path: `/${name}`, handler: `${uid}.create`, config: {} },
          { method: 'PUT', path: `/${name}/:id`, handler: `${uid}.update` },
          { method: 'DELETE', path: `/${name}/:id`, handler: `${uid}.delete` },
        ],
      };
    },
  },
}));

// The count route depends on the compatibility mode, which is read from the configuration
const stubCompat = (usersPermissions: boolean) =>
  vi.stubGlobal('strapi', {
    config: {
      get: (key: string) => (key.endsWith('.usersPermissions') ? usersPermissions : undefined),
    },
  });

// Also while the tests are collected: a `describe` body reads the routes
stubCompat(false);
beforeEach(() => stubCompat(false));
afterEach(() => vi.unstubAllGlobals());

const describeRoute = ({ method, path }: { method: string; path: string }) => `${method} ${path}`;

describe('the users routes', () => {
  describe('me', () => {
    it('gives each me route a config object of its own', () => {
      const configs = meRoutes.map(({ config }) => config);

      expect(new Set(configs).size).toBe(meRoutes.length);
    });

    it('are the signed-in user and their own profile', () => {
      expect(meRoutes.map(describeRoute)).toEqual([
        'GET /users/me',
        'GET /users/me/profile',
        'PUT /users/me/profile',
      ]);
      expect(meRoutes.map(({ handler }) => handler)).toEqual([
        'me.find',
        'me.findProfile',
        'me.updateProfile',
      ]);
    });

    it('are mounted outside the plugin prefix, at /api/users/me', () => {
      for (const route of meRoutes) {
        expect(route.config).toMatchObject({ prefix: '' });
      }
    });

    it('use PUT to update, never PATCH', () => {
      expect(meRoutes.some(({ method }) => method === 'PATCH')).toBe(false);
    });

    it('set no auth of their own: the scope is derived, and a role has to be granted it', () => {
      for (const route of meRoutes) {
        expect(route.config).not.toHaveProperty('auth');
      }
    });
  });

  describe('core routes', () => {
    const routes = usersRoutes();

    it('are the five of the user type at /users and the five of the profile type at /profiles', () => {
      expect(routes.map(describeRoute)).toEqual(
        expect.arrayContaining([
          'GET /users',
          'GET /users/:id',
          'POST /users',
          'PUT /users/:id',
          'DELETE /users/:id',
          'GET /profiles',
          'GET /profiles/:id',
          'POST /profiles',
          'PUT /profiles/:id',
          'DELETE /profiles/:id',
        ])
      );
      expect(routes).toHaveLength(13);
    });

    it('answer with the core controller of their type', () => {
      const handlers = routes.map(({ handler }) => handler);

      for (const action of ['find', 'findOne', 'create', 'update', 'delete']) {
        expect(handlers).toContain(`${USER_UID}.${action}`);
        expect(handlers).toContain(`${PROFILE_UID}.${action}`);
      }
    });

    it('are all mounted outside the plugin prefix', () => {
      for (const route of routes) {
        expect(route.config).toMatchObject({ prefix: '' });
      }
    });

    it('are the core routes with the prefix added and nothing else', () => {
      const first = routes.find(({ handler }) => handler === `${USER_UID}.find`);

      expect(first?.config).toEqual({ prefix: '' });
    });

    it('come after the me routes: /users/me is also what /users/:id matches, and the first one answers', () => {
      const paths = routes.map(describeRoute);

      expect(paths.indexOf('GET /users/me')).toBeLessThan(paths.indexOf('GET /users/:id'));
      expect(paths.indexOf('GET /users/me/profile')).toBeLessThan(paths.indexOf('GET /users/:id'));
    });

    it('are made when read, from the content type then, and not when the module loads', () => {
      expect(typeof usersRoutes).toBe('function');
    });
  });

  describe('count', () => {
    it('is a route before the core routes while compat is on, with a scope of its own', () => {
      stubCompat(true);

      const paths = usersRoutes().map(describeRoute);

      expect(paths).toContain('GET /users/count');
      expect(paths.indexOf('GET /users/count')).toBeLessThan(paths.indexOf('GET /users/:id'));

      const route = usersRoutes().find(({ path }) => path === '/users/count');
      const first = usersRoutes().find(({ path }) => path === '/users/me');

      expect(route?.handler).toBe(`${USER_UID}.count`);
      expect(route?.config).not.toBe(first?.config);
    });

    it('is not a route with compat off', () => {
      expect(usersRoutes().map(describeRoute)).not.toContain('GET /users/count');
    });
  });

  it('are in the Content API routes of the plugin, after the Better Auth catch-all', () => {
    const { type, routes } = createContentApiRoutes() as unknown as {
      type: string;
      routes: Array<{ method: string; path: string }>;
    };

    expect(type).toBe('content-api');

    const paths = routes.map(describeRoute);

    expect(paths.slice(0, 2).sort()).toEqual(['GET /auth/:path*', 'POST /auth/:path*']);
    expect(paths).toContain('GET /users/me');
    expect(paths).toContain('GET /profiles/:id');
  });
});
