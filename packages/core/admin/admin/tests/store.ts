import { fixtures } from '@strapi/admin-test-utils';

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
      {
        uid: 'api::homepage.homepage',
        isDisplayed: true,
        apiID: 'homepage',
        kind: 'singleType',
        info: {
          displayName: 'Homepage',
          singularName: 'homepage',
          pluralName: 'homepages',
        },
        options: {},
        pluginOptions: {
          i18n: {
            localized: true,
          },
        },
        attributes: {
          id: {
            type: 'integer',
          },
          title: {
            type: 'string',
            required: true,
            pluginOptions: {
              i18n: {
                localized: true,
              },
            },
          },
          slug: {
            type: 'uid',
            targetField: 'title',
            required: true,
            pluginOptions: {
              i18n: {
                localized: true,
              },
            },
          },
          single: {
            type: 'media',
            allowedTypes: ['images', 'files', 'videos'],
            required: false,
          },
          multiple: {
            type: 'media',
            multiple: true,
            allowedTypes: ['images', 'videos'],
            required: false,
          },
          createdAt: {
            type: 'datetime',
          },
          updatedAt: {
            type: 'datetime',
          },
          createdBy: {
            type: 'relation',
            relation: 'oneToOne',
            target: 'admin::user',
            configurable: false,
            writable: false,
            visible: false,
            useJoinTable: false,
            private: true,
            targetModel: 'admin::user',
            relationType: 'oneToOne',
          },
          updatedBy: {
            type: 'relation',
            relation: 'oneToOne',
            target: 'admin::user',
            configurable: false,
            writable: false,
            visible: false,
            useJoinTable: false,
            private: true,
            targetModel: 'admin::user',
            relationType: 'oneToOne',
          },
        },
      },
    ],
    singleTypeLinks: [],
    isLoading: true,
  },
};

export { initialState };
