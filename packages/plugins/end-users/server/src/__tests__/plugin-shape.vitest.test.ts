import { describe, expect, it } from 'vitest';

import plugin from '../index';
import { PLUGIN_ID, USER_UID, PROFILE_UID, ROLE_UID, PERMISSION_UID } from '../constants';

describe('end-users plugin shape', () => {
  it('exposes the lifecycle functions', () => {
    expect(typeof plugin.register).toBe('function');
    expect(typeof plugin.bootstrap).toBe('function');
    expect(typeof plugin.destroy).toBe('function');
  });

  it('ships the role, permission and profile types, and the services that work on them', () => {
    expect(Object.keys(plugin.contentTypes).sort()).toEqual(['permission', 'profile', 'role']);
    expect(plugin.contentTypes.role.schema.info.singularName).toBe('role');
    expect(plugin.contentTypes.permission.schema.info.singularName).toBe('permission');
    expect(ROLE_UID).toBe(`plugin::${PLUGIN_ID}.role`);
    expect(PERMISSION_UID).toBe(`plugin::${PLUGIN_ID}.permission`);
    expect(Object.keys(plugin.services).sort()).toEqual([
      'ability',
      'builder-layout',
      'compat',
      'condition',
      'engine',
      'permission',
      'permission-layout',
      'profile',
      'provider',
      'role',
      'settings',
      'user',
      'user-security',
    ]);
  });

  it("has a controller for the Better Auth catch-all, the me routes, the caller's permissions, the user and profile types, and the admin roles, conditions, settings and permission layout", () => {
    expect(Object.keys(plugin.controllers).sort()).toEqual([
      'auth',
      'condition',
      'connect',
      'me',
      'permission-layout',
      'permissions',
      'profile',
      'provider',
      'role',
      'settings',
      'user',
      'user-security',
    ]);
  });

  it('ships the policies the admin layout routes and the builder`s writes check with', () => {
    expect(Object.keys(plugin.policies)).toEqual(['has-any-admin-permission', 'is-development']);
  });

  it('uses the decided names', () => {
    expect(PLUGIN_ID).toBe('end-users');
    expect(USER_UID).toBe('plugin::end-users.user');
    expect(PROFILE_UID).toBe('plugin::end-users.profile');
  });
});
