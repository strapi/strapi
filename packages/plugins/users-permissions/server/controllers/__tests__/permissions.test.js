'use strict';

/* eslint-env jest */

const permissionsController = require('../permissions');

const CATALOGUE = {
  'api::article': {
    controllers: {
      article: {
        find: { enabled: false, policy: '' },
        findOne: { enabled: false, policy: '' },
      },
    },
  },
  'plugin::users-permissions': {
    controllers: {
      permissions: {
        getPermissions: { enabled: false, policy: '' },
      },
    },
  },
};

const usersPermissionsService = {
  getActions: jest.fn(() => JSON.parse(JSON.stringify(CATALOGUE))),
  getActionsForPermissions(permissions = []) {
    const actions = this.getActions();

    permissions.forEach(({ action }) => {
      const [type, controller, actionName] = action.split('.');
      actions[type].controllers[controller][actionName] = { enabled: true, policy: '' };
    });

    return actions;
  },
};

const permissionService = {
  findRolePermissions: jest.fn(),
  findPublicPermissions: jest.fn(),
};

const makeCtx = ({ routeType, user } = {}) => ({
  state: {
    route: routeType ? { info: { type: routeType } } : undefined,
    user,
  },
  send: jest.fn(),
});

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
    const ctx = makeCtx({ routeType: 'admin' });

    await permissionsController.getPermissions(ctx);

    expect(ctx.send).toHaveBeenCalledWith({ permissions: CATALOGUE });
    expect(permissionService.findRolePermissions).not.toHaveBeenCalled();
    expect(permissionService.findPublicPermissions).not.toHaveBeenCalled();
  });

  test("returns the authenticated caller's role permissions on the content API", async () => {
    permissionService.findRolePermissions.mockResolvedValue([
      { action: 'plugin::users-permissions.permissions.getPermissions' },
      { action: 'api::article.article.find' },
    ]);

    const ctx = makeCtx({ routeType: 'content-api', user: { role: { id: 2 } } });

    await permissionsController.getPermissions(ctx);

    expect(permissionService.findRolePermissions).toHaveBeenCalledWith(2);
    expect(permissionService.findPublicPermissions).not.toHaveBeenCalled();

    const { permissions } = ctx.send.mock.calls[0][0];

    expect(permissions['plugin::users-permissions'].controllers.permissions.getPermissions).toEqual(
      { enabled: true, policy: '' }
    );
    expect(permissions['api::article'].controllers.article.find).toEqual({
      enabled: true,
      policy: '',
    });
    expect(permissions['api::article'].controllers.article.findOne).toEqual({
      enabled: false,
      policy: '',
    });
  });

  test('falls back to the public role permissions when there is no user', async () => {
    permissionService.findPublicPermissions.mockResolvedValue([
      { action: 'api::article.article.find' },
    ]);

    const ctx = makeCtx({ routeType: 'content-api' });

    await permissionsController.getPermissions(ctx);

    expect(permissionService.findPublicPermissions).toHaveBeenCalled();
    expect(permissionService.findRolePermissions).not.toHaveBeenCalled();

    const { permissions } = ctx.send.mock.calls[0][0];

    expect(permissions['api::article'].controllers.article.find).toEqual({
      enabled: true,
      policy: '',
    });
    expect(permissions['plugin::users-permissions'].controllers.permissions.getPermissions).toEqual(
      { enabled: false, policy: '' }
    );
  });
});
