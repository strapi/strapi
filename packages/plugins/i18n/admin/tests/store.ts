import { fixtures } from '@strapi/admin-test-utils';

/**
 * This is for the redux store in `utils`.
 * The more we adopt it, the bigger it will get – which is okay.
 */
const initialState = {
  i18n_locales: {
    isLoading: true,
    locales: [],
  },
  admin_app: { permissions: fixtures.permissions.app },
  rbacProvider: {
    allPermissions: [
      ...fixtures.permissions.allPermissions,
      {
        id: 314,
        action: 'admin::users.read',
        subject: null,
        properties: {},
        conditions: [],
      },
    ],
    collectionTypesRelatedPermissions: {
      foo: {
        'plugin::content-manager.explorer.read': [
          {
            action: 'plugin::content-manager.explorer.read',
            subject: 'foo',
            properties: {
              fields: ['f1'],
            },
            conditions: [],
          },
        ],
        'plugin::content-manager.explorer.create': [
          {
            action: 'plugin::content-manager.explorer.create',
            subject: 'foo',
            properties: {
              fields: ['f2'],
            },
            conditions: [],
          },
        ],
      },
    },
  },
};

export { initialState };
