import { fixtures } from '@strapi/admin-test-utils';

import { Permission } from '../src/components/RBACProvider';

/**
 * This is for the redux store in `utils`.
 * The more we adopt it, the bigger it will get – which is okay.
 */
const initialState = {
  admin_app: {
    language: {
      locale: 'en',
      localeNames: { en: 'English' },
    },
    permissions: fixtures.permissions.app,
    theme: {
      availableThemes: [],
      currentTheme: 'light',
    },
  },
  'content-manager_app': {
    collectionTypeLinks: [],
    components: [
      {
        uid: 'blog.test-como',
        isDisplayed: true,
        apiID: 'test-como',
        category: 'blog',
        info: {
          displayName: 'test comp',
          icon: 'air-freshener',
          description: '',
        },
        options: {},
        attributes: {
          id: {
            type: 'integer',
          },
          name: {
            type: 'string',
            default: 'toto',
          },
        },
      },
    ],
    fieldSizes: {},
    models: [
      {
        uid: 'api::address.address',
        isDisplayed: true,
        apiID: 'address',
        kind: 'collectionType',
        info: {
          displayName: 'Address',
          singularName: 'address',
          pluralName: 'addresses',
          description: '',
          name: 'Address',
        },
        options: {},
        pluginOptions: {},
        attributes: {
          id: {
            type: 'integer',
          },
          postal_code: {
            type: 'string',
            pluginOptions: {},
            maxLength: 2,
          },
          json: {
            type: 'json',
            pluginOptions: {},
          },
          slug: {
            type: 'uid',
          },
          repeat_req_min: {
            type: 'component',
            repeatable: true,
            pluginOptions: {},
            component: 'blog.test-como',
            required: false,
            min: 2,
          },
          createdAt: {
            type: 'datetime',
          },
          updatedAt: {
            type: 'datetime',
          },
        },
      },
    ],
    singleTypeLinks: [],
    isLoading: true,
  },
  rbacProvider: {
    allPermissions: fixtures.permissions.allPermissions,
    collectionTypesRelatedPermissions: fixtures.permissions.allPermissions
      .filter((perm) => perm.subject)
      .reduce<Record<string, Record<string, Permission[]>>>((acc, current) => {
        const { subject, action } = current;

        if (!subject) return acc;

        if (!acc[subject]) {
          acc[subject] = {};
        }

        acc[subject] = acc[subject][action]
          ? { ...acc[subject], [action]: [...acc[subject][action], current] }
          : { ...acc[subject], [action]: [current] };

        return acc;
      }, {}),
  },
};

export { initialState };
