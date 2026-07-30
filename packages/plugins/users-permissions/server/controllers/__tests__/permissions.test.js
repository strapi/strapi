'use strict';

/* eslint-env jest */

const permissionsController = require('../permissions');

// Sentinels: the merge itself is covered by the users-permissions service tests
const CATALOGUE = Symbol('catalogue');
const FULL_CATALOGUE = Symbol('catalogue with every action enabled');
const MERGED = Symbol('merged permissions');

const usersPermissionsService = {
  getActions: jest.fn(({ defaultEnable = false } = {}) =>
    defaultEnable ? FULL_CATALOGUE : CATALOGUE
  ),
  getActionsForPermissions: jest.fn(() => MERGED),
};

const permissionService = {
  findRolePermissions: jest.fn(),
  findPublicPermissions: jest.fn(),
};

const makeCtx = ({ routeType, user, strategy = 'users-permissions', credentials } = {}) => ({
  state: {
    route: routeType ? { info: { type: routeType } } : undefined,
    auth: { strategy: { name: strategy }, credentials },
    user,
  },
  send: jest.fn(),
});

const expectNoRoleLookup = () => {
  expect(permissionService.findRolePermissions).not.toHaveBeenCalled();
  expect(permissionService.findPublicPermissions).not.toHaveBeenCalled();
};

beforeEach(() => {
  jest.clearAllMocks();

  // The unit setup derives `strapi.plugin(name).service(name)` from `strapi.plugins`
  global.strapi = {
    plugins: {
      'users-permissions': {
        services: {
          permission: permissionService,
          'users-permissions': usersPermissionsService,
        },
      },
    },
  };
});

describe('getPermissions', () => {
  test('returns the all-disabled action catalogue on the admin router', async () => {
    const ctx = makeCtx({ routeType: 'admin', strategy: 'admin' });

    await permissionsController.getPermissions(ctx);

    expect(ctx.send).toHaveBeenCalledWith({ permissions: CATALOGUE });
    expect(usersPermissionsService.getActionsForPermissions).not.toHaveBeenCalled();
    expectNoRoleLookup();
  });

  test("returns the authenticated caller's role permissions on the content API", async () => {
    const rolePermissions = [
      { action: 'plugin::users-permissions.permissions.getPermissions' },
      { action: 'api::article.article.find' },
    ];
    permissionService.findRolePermissions.mockResolvedValue(rolePermissions);

    const ctx = makeCtx({ routeType: 'content-api', user: { role: { id: 2 } } });

    await permissionsController.getPermissions(ctx);

    expect(permissionService.findRolePermissions).toHaveBeenCalledWith(2);
    expect(permissionService.findPublicPermissions).not.toHaveBeenCalled();
    expect(usersPermissionsService.getActionsForPermissions).toHaveBeenCalledWith(rolePermissions);
    expect(ctx.send).toHaveBeenCalledWith({ permissions: MERGED });
  });

  test('falls back to the public role permissions when there is no user', async () => {
    const publicPermissions = [{ action: 'api::article.article.find' }];
    permissionService.findPublicPermissions.mockResolvedValue(publicPermissions);

    const ctx = makeCtx({ routeType: 'content-api' });

    await permissionsController.getPermissions(ctx);

    expect(permissionService.findPublicPermissions).toHaveBeenCalled();
    expect(permissionService.findRolePermissions).not.toHaveBeenCalled();
    expect(usersPermissionsService.getActionsForPermissions).toHaveBeenCalledWith(
      publicPermissions
    );
    expect(ctx.send).toHaveBeenCalledWith({ permissions: MERGED });
  });

  test('enables every action for a full-access API token', async () => {
    const ctx = makeCtx({
      routeType: 'content-api',
      strategy: 'content-api-token',
      credentials: { type: 'full-access' },
    });

    await permissionsController.getPermissions(ctx);

    expect(usersPermissionsService.getActions).toHaveBeenCalledWith({ defaultEnable: true });
    expect(ctx.send).toHaveBeenCalledWith({ permissions: FULL_CATALOGUE });
    expectNoRoleLookup();
  });

  test("returns a custom API token's own actions", async () => {
    const ctx = makeCtx({
      routeType: 'content-api',
      strategy: 'content-api-token',
      credentials: {
        type: 'custom',
        permissions: ['api::article.article.find'],
      },
    });

    await permissionsController.getPermissions(ctx);

    expect(usersPermissionsService.getActionsForPermissions).toHaveBeenCalledWith([
      { action: 'api::article.article.find' },
    ]);
    expect(ctx.send).toHaveBeenCalledWith({ permissions: MERGED });
    expectNoRoleLookup();
  });

  test('never reports the public role permissions to an API token caller', async () => {
    const ctx = makeCtx({
      routeType: 'content-api',
      strategy: 'content-api-token',
      credentials: { type: 'read-only' },
    });

    await permissionsController.getPermissions(ctx);

    expect(ctx.send).toHaveBeenCalledWith({ permissions: CATALOGUE });
    expectNoRoleLookup();
  });
});
