import { fixtures } from '@strapi/admin-test-utils';

/**
 * This is for the redux store in `utils`.
 * The more we adopt it, the bigger it will get – which is okay.
 */
const initialState = {
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
      'api::category.category': {
        'plugin::content-manager.explorer.update': [
          {
            action: 'plugin::content-manager.explorer.update',
            subject: 'api::category.category',
            properties: {
              locales: ['en'],
            },
          },
        ],
      },
    },
  },
};

export { initialState };
