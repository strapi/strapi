import { describe, expect, it } from 'vitest';

import adminRoutes from '..';
import usersPermissionsActions from '../../../bootstrap/users-permissions-actions';

const protectedRoutes = [
  ['GET', '/roles/:id', 'role.findOne', 'roles.read'],
  ['GET', '/roles', 'role.find', 'roles.read'],
  ['POST', '/roles', 'role.createRole', 'roles.create'],
  ['PUT', '/roles/:role', 'role.updateRole', 'roles.update'],
  ['DELETE', '/roles/:role', 'role.deleteRole', 'roles.delete'],
  ['GET', '/email-templates', 'settings.getEmailTemplate', 'email-templates.read'],
  ['PUT', '/email-templates', 'settings.updateEmailTemplate', 'email-templates.update'],
  ['GET', '/advanced', 'settings.getAdvancedSettings', 'advanced-settings.read'],
  ['PUT', '/advanced', 'settings.updateAdvancedSettings', 'advanced-settings.update'],
  ['GET', '/providers', 'settings.getProviders', 'providers.read'],
  ['PUT', '/providers', 'settings.updateProviders', 'providers.update'],
] as const;

describe('admin route authorization', () => {
  it.each(protectedRoutes)(
    '%s %s requires its registered permission',
    (method, path, handler, uid) => {
      const route = adminRoutes.routes.find(
        (entry) => entry.method === method && entry.path === path
      );

      expect(route).toStrictEqual({
        method,
        path,
        handler,
        config: {
          policies: [
            {
              name: 'admin::hasPermissions',
              config: { actions: [`plugin::users-permissions.${uid}`] },
            },
          ],
        },
      });
      expect(usersPermissionsActions.actions.some((action) => action.uid === uid)).toBe(true);
    }
  );

  it('keeps role routes ahead of settings and permission discovery routes', () => {
    expect(adminRoutes.type).toBe('admin');
    expect(adminRoutes.routes.map(({ method, path, handler }) => [method, path, handler])).toEqual([
      ...protectedRoutes.map(([method, path, handler]) => [method, path, handler]),
      ['GET', '/permissions', 'permissions.getPermissions'],
      ['GET', '/policies', 'permissions.getPolicies'],
      ['GET', '/routes', 'permissions.getRoutes'],
    ]);
  });

  it('retains default admin authentication for every endpoint', () => {
    for (const route of adminRoutes.routes) {
      expect(route.config?.auth).toBeUndefined();
    }

    expect(adminRoutes.routes.slice(-3)).toStrictEqual([
      { method: 'GET', path: '/permissions', handler: 'permissions.getPermissions' },
      { method: 'GET', path: '/policies', handler: 'permissions.getPolicies' },
      { method: 'GET', path: '/routes', handler: 'permissions.getRoutes' },
    ]);
  });
});
