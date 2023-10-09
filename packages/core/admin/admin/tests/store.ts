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
  'content-manager_listView': {
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
