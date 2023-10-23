import { fixtures } from '@strapi/admin-test-utils';

/**
 * This is for the redux store in `utils`.
 * The more we adopt it, the bigger it will get – which is okay.
 */
const initialState = {
  admin_app: { permissions: fixtures.permissions.app },
  'content-manager_app': {
    fieldSizes: {},
  },
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
  },
  'content-manager_listView': {
    data: [
      { id: 1, publishedAt: null },
      { id: 2, publishedAt: '2023-01-01T10:10:10.408Z' },
    ],
    displayedHeaders: [],
    contentType: {
      uid: 'api::test.test',
      settings: {
        mainField: 'name',
      },
      attributes: {
        id: { type: 'integer' },
        name: { type: 'string', required: true },
      },
    },
    components: [],
  },
};

export { initialState };
