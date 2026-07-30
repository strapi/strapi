'use strict';

/* eslint-env jest */

const createUsersPermissionsService = require('../users-permissions');

const contentApiAction = () => {
  const action = () => {};
  action[Symbol.for('__type__')] = ['content-api'];
  return action;
};

const adminOnlyAction = () => {
  const action = () => {};
  action[Symbol.for('__type__')] = ['admin'];
  return action;
};

const createService = () =>
  createUsersPermissionsService({
    strapi: {
      apis: {
        article: {
          controllers: {
            article: { find: contentApiAction(), findOne: contentApiAction() },
          },
        },
      },
      plugins: {
        'users-permissions': {
          controllers: {
            permissions: { getPermissions: contentApiAction(), getPolicies: adminOnlyAction() },
          },
        },
      },
    },
  });

describe('getActions', () => {
  test('only lists content-api actions, all disabled by default', () => {
    expect(createService().getActions()).toEqual({
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
    });
  });
});

describe('getActionsForPermissions', () => {
  test('enables the actions held by the given permissions and leaves the rest disabled', () => {
    const actions = createService().getActionsForPermissions([
      { action: 'api::article.article.find' },
      { action: 'plugin::users-permissions.permissions.getPermissions' },
    ]);

    expect(actions['api::article'].controllers.article.find).toEqual({
      enabled: true,
      policy: '',
    });
    expect(actions['plugin::users-permissions'].controllers.permissions.getPermissions).toEqual({
      enabled: true,
      policy: '',
    });
    expect(actions['api::article'].controllers.article.findOne).toEqual({
      enabled: false,
      policy: '',
    });
  });

  test('returns the untouched catalogue for an empty permission list', () => {
    const service = createService();

    expect(service.getActionsForPermissions([])).toEqual(service.getActions());
    expect(service.getActionsForPermissions()).toEqual(service.getActions());
  });
});
