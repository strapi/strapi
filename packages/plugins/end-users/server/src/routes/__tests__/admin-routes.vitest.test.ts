import { describe, expect, it } from 'vitest';

import {
  ADMIN_ACTIONS,
  CONDITION_ACTIONS,
  PROVIDER_ACTIONS,
  ROLE_ACTIONS,
  SETTINGS_ACTIONS,
} from '../../admin-actions';
import controllers from '../../controllers';
import pluginPolicies from '../../policies';
import routes from '../index';
import admin from '../admin';
import conditions from '../admin/conditions';
import { guard, guardAny } from '../admin/guard';
import migration from '../admin/migration';
import permissions from '../admin/permissions';
import providers from '../admin/providers';
import roles from '../admin/roles';
import settings from '../admin/settings';
import userSecurity from '../admin/user-security';

const describeRoute = ({ method, path }: { method: string; path: string }) => `${method} ${path}`;

/** The controller and the method a handler (`role.find`, `permission-layout.layout`) names */
const splitHandler = (handler: unknown) => {
  const text = handler as string;
  const cut = text.lastIndexOf('.');

  return { name: text.slice(0, cut), method: text.slice(cut + 1) };
};

describe('the admin routes', () => {
  it('are admin routes of the plugin, under /end-users', () => {
    expect(routes.admin).toBe(admin);
    expect(admin.type).toBe('admin');
    expect(admin.prefix).toBeUndefined();
    expect(admin.routes).toEqual([
      ...roles.routes,
      ...permissions.routes,
      ...conditions.routes,
      ...providers.routes,
      ...migration.routes,
      ...settings.routes,
      ...userSecurity.routes,
    ]);
  });

  /**
   * The user-security routes check their action in the controller, with the admin's ability and
   * the user in hand, so they carry no `hasPermissions` policy of their own.
   */
  const checkedByPolicy = admin.routes.filter((route) => !userSecurity.routes.includes(route));

  describe('every one of them', () => {
    it('is signed in first, then needs the action it checks: no route is open to an admin without it', () => {
      expect(checkedByPolicy.length).toBeGreaterThan(0);

      for (const route of checkedByPolicy) {
        const policies = route.config?.policies as Array<string | { name: string }>;
        const [first, check] = policies;

        expect(first, describeRoute(route)).toBe('admin::isAuthenticatedAdmin');
        expect(policies.length, describeRoute(route)).toBeGreaterThanOrEqual(2);
        expect(
          ['admin::hasPermissions', 'plugin::end-users.has-any-admin-permission'],
          describeRoute(route)
        ).toContain((check as { name: string }).name);
        expect(route.config?.auth, describeRoute(route)).toBeUndefined();
      }
    });

    it('checks only actions the plugin registers', () => {
      const registered = ADMIN_ACTIONS.map(({ pluginName, uid }) => `plugin::${pluginName}.${uid}`);

      for (const route of checkedByPolicy) {
        const policies = (route.config?.policies ?? []) as Array<{ config: { actions: string[] } }>;
        const check = policies[1];

        expect(check.config.actions.length, describeRoute(route)).toBeGreaterThan(0);

        for (const action of check.config.actions) {
          expect(registered, describeRoute(route)).toContain(action);
        }
      }
    });

    it('calls a handler its controller has', () => {
      for (const route of admin.routes) {
        const { name, method } = splitHandler(route.handler);
        const controller = (
          controllers as unknown as Record<string, (ctx: { strapi: never }) => object>
        )[name]({ strapi: {} as never });

        expect(typeof controller[method as keyof typeof controller], describeRoute(route)).toBe(
          'function'
        );
      }
    });
  });

  describe('the roles routes', () => {
    it('are the documented ones, with :documentId and PUT, never :id or PATCH', () => {
      expect(roles.routes.map(describeRoute).sort()).toEqual([
        'DELETE /roles/:documentId',
        'GET /roles',
        'GET /roles/:documentId',
        'GET /roles/:documentId/export',
        'POST /roles',
        'POST /roles/import',
        'PUT /roles/:documentId',
      ]);
    });

    it.each([
      ['GET /roles', 'role.find', ROLE_ACTIONS.read],
      ['POST /roles', 'role.create', ROLE_ACTIONS.create],
      ['POST /roles/import', 'role.import', ROLE_ACTIONS.create],
      ['GET /roles/:documentId', 'role.findOne', ROLE_ACTIONS.read],
      ['PUT /roles/:documentId', 'role.update', ROLE_ACTIONS.update],
      ['DELETE /roles/:documentId', 'role.delete', ROLE_ACTIONS.delete],
      ['GET /roles/:documentId/export', 'role.export', ROLE_ACTIONS.read],
    ])('%s is handled by %s and needs %s', (route, handler, action) => {
      const found = roles.routes.find((candidate) => describeRoute(candidate) === route);

      expect(found?.handler).toBe(handler);
      expect(found?.config).toEqual(guard(action));
    });
  });

  describe('the user security routes', () => {
    it('are signed in only, the Content Manager action being checked by the controller, PUT or POST and never PATCH', () => {
      expect(userSecurity.routes.map(describeRoute).sort()).toEqual([
        'DELETE /users/:documentId/accounts/:accountId',
        'DELETE /users/:documentId/sessions',
        'DELETE /users/:documentId/sessions/:sessionId',
        'GET /users/:documentId/effective-permissions',
        'GET /users/:documentId/security',
        'POST /users/:documentId/ban',
        'POST /users/:documentId/send-password-reset',
        'POST /users/:documentId/send-verification',
        'POST /users/:documentId/two-factor/reset',
        'POST /users/:documentId/unban',
        'POST /users/:documentId/unlock',
      ]);

      for (const route of userSecurity.routes) {
        expect(route.config, describeRoute(route)).toEqual({
          policies: ['admin::isAuthenticatedAdmin'],
        });
        expect(route.handler as string, describeRoute(route)).toMatch(/^user-security\./);
      }
    });
  });

  describe('the providers routes', () => {
    it('are the five documented ones, with :id and PUT, never PATCH', () => {
      expect(providers.routes.map(describeRoute).sort()).toEqual([
        'DELETE /providers/:id',
        'GET /providers',
        'GET /providers/:id',
        'POST /providers',
        'PUT /providers/:id',
      ]);
    });

    it.each([
      ['GET /providers', 'provider.find', PROVIDER_ACTIONS.read],
      ['GET /providers/:id', 'provider.findOne', PROVIDER_ACTIONS.read],
      ['POST /providers', 'provider.create', PROVIDER_ACTIONS.update],
      ['PUT /providers/:id', 'provider.update', PROVIDER_ACTIONS.update],
      ['DELETE /providers/:id', 'provider.delete', PROVIDER_ACTIONS.update],
    ])('%s is handled by %s and needs %s', (route, handler, action) => {
      const found = providers.routes.find((candidate) => describeRoute(candidate) === route);

      expect(found?.handler).toBe(handler);
      expect(found?.config).toEqual(guard(action));
    });
  });

  describe('the permission layout routes', () => {
    it.each([
      ['GET /permissions/layout', 'permission-layout.layout'],
      ['GET /permissions/routes', 'permission-layout.routes'],
    ])(
      '%s is handled by %s, for an admin who reads roles or reads conditions',
      (route, handler) => {
        const found = permissions.routes.find((candidate) => describeRoute(candidate) === route);

        expect(found?.handler).toBe(handler);
        expect(found?.config?.policies).toEqual([
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::end-users.has-any-admin-permission',
            config: { actions: [ROLE_ACTIONS.read, CONDITION_ACTIONS.read] },
          },
        ]);
      }
    );

    it('are the only two', () => {
      expect(permissions.routes).toHaveLength(2);
    });
  });

  describe('the conditions routes', () => {
    it.each([
      ['GET /conditions', 'condition.find'],
      ['GET /conditions/status', 'condition.status'],
      ['GET /conditions/builder-layout', 'condition.builderLayout'],
      ['POST /conditions/preview', 'condition.preview'],
    ])('%s is handled by %s, for an admin who reads conditions', (route, handler) => {
      const found = conditions.routes.find((candidate) => describeRoute(candidate) === route);

      expect(found?.handler).toBe(handler);
      expect(found?.config).toEqual(guard(CONDITION_ACTIONS.read));
    });

    it.each([
      ['POST /conditions', 'condition.create'],
      ['PUT /conditions/:slug', 'condition.update'],
      ['DELETE /conditions/:slug', 'condition.delete'],
    ])(
      '%s is handled by %s: signed in, then conditions.update, and only then development only',
      (route, handler) => {
        const found = conditions.routes.find((candidate) => describeRoute(candidate) === route);

        expect(found?.handler).toBe(handler);
        // In this order: only an authorized admin learns whether Strapi runs in development
        expect(found?.config?.policies).toEqual([
          'admin::isAuthenticatedAdmin',
          { name: 'admin::hasPermissions', config: { actions: [CONDITION_ACTIONS.update] } },
          'plugin::end-users.is-development',
        ]);
      }
    );

    it('are the list, the status, the builder layout, the preview and the three writes: PUT to update, never PATCH', () => {
      expect(conditions.routes.map(describeRoute).sort()).toEqual([
        'DELETE /conditions/:slug',
        'GET /conditions',
        'GET /conditions/builder-layout',
        'GET /conditions/status',
        'POST /conditions',
        'POST /conditions/preview',
        'PUT /conditions/:slug',
      ]);
    });

    it('names a policy the plugin ships for development only', () => {
      for (const route of conditions.routes) {
        const policies = route.config?.policies as Array<string | { name: string }>;

        if (policies.includes('plugin::end-users.is-development')) {
          expect(Object.keys(pluginPolicies)).toContain('is-development');
        }
      }
    });
  });

  describe('the migration routes', () => {
    it.each([
      ['GET /migration', 'migration.status', SETTINGS_ACTIONS.read],
      ['PUT /migration/items/:id', 'migration.updateItem', SETTINGS_ACTIONS.update],
      ['POST /migration/check', 'migration.check', SETTINGS_ACTIONS.update],
      ['GET /migration/files', 'migration.files', SETTINGS_ACTIONS.read],
      ['POST /migration/files', 'migration.writeFiles', SETTINGS_ACTIONS.update],
    ])('%s is handled by %s and needs %s', (route, handler, action) => {
      const found = migration.routes.find((candidate) => describeRoute(candidate) === route);

      expect(found?.handler).toBe(handler);
      expect(found?.config).toEqual(guard(action));
    });

    it('are the five: PUT to update, never PATCH', () => {
      expect(migration.routes.map(describeRoute).sort()).toEqual([
        'GET /migration',
        'GET /migration/files',
        'POST /migration/check',
        'POST /migration/files',
        'PUT /migration/items/:id',
      ]);
    });
  });

  describe('the settings routes', () => {
    it.each([
      ['GET /settings', 'settings.find', SETTINGS_ACTIONS.read],
      ['PUT /settings', 'settings.update', SETTINGS_ACTIONS.update],
    ])('%s is handled by %s and needs %s', (route, handler, action) => {
      const found = settings.routes.find((candidate) => describeRoute(candidate) === route);

      expect(found?.handler).toBe(handler);
      expect(found?.config).toEqual(guard(action));
    });

    it('are the two: PUT to update, never PATCH', () => {
      expect(settings.routes.map(describeRoute).sort()).toEqual(['GET /settings', 'PUT /settings']);
    });
  });

  describe('the guards', () => {
    it('guard needs the one action, and guardAny any of several', () => {
      expect(guard('a.b.c').policies).toEqual([
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['a.b.c'] } },
      ]);
      expect(guardAny(['a.b.c', 'd.e.f']).policies).toEqual([
        'admin::isAuthenticatedAdmin',
        {
          name: 'plugin::end-users.has-any-admin-permission',
          config: { actions: ['a.b.c', 'd.e.f'] },
        },
      ]);
    });
  });

  it('use the fixed action names', () => {
    expect(ROLE_ACTIONS).toEqual({
      read: 'plugin::end-users.roles.read',
      create: 'plugin::end-users.roles.create',
      update: 'plugin::end-users.roles.update',
      delete: 'plugin::end-users.roles.delete',
    });
    expect(CONDITION_ACTIONS).toEqual({
      read: 'plugin::end-users.conditions.read',
      update: 'plugin::end-users.conditions.update',
    });
    expect(SETTINGS_ACTIONS).toEqual({
      read: 'plugin::end-users.settings.read',
      update: 'plugin::end-users.settings.update',
    });
  });
});
