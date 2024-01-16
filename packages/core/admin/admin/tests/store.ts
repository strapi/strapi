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
    ],
    singleTypeLinks: [],
    isLoading: true,
  },
  rbacProvider: {
    allPermissions: fixtures.permissions.allPermissions,
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
        createdAt: { type: 'datetime' },
        updatedAt: { type: 'datetime' },
      },
      metadatas: {
        id: {
          edit: {},
          list: { label: 'id', searchable: true, sortable: true },
        },
        name: {
          edit: {
            label: 'name',
            description: '',
            placeholder: '',
            visible: true,
            editable: true,
          },
          list: { label: 'name', searchable: true, sortable: true },
        },
        createdAt: {
          edit: {
            label: 'createdAt',
            description: '',
            placeholder: '',
            visible: false,
            editable: true,
          },
          list: { label: 'createdAt', searchable: true, sortable: true },
        },
        updatedAt: {
          edit: {
            label: 'updatedAt',
            description: '',
            placeholder: '',
            visible: false,
            editable: true,
          },
          list: { label: 'updatedAt', searchable: true, sortable: true },
        },
      },
    },
    components: {},
    data: [
      { id: 1, publishedAt: null },
      { id: 2, publishedAt: '2023-01-01T10:10:10.408Z' },
    ],
    displayedHeaders: [
      {
        key: '__id_key__',
        name: 'id',
        fieldSchema: { type: 'integer' },
        metadatas: { label: 'id', searchable: true, sortable: true },
      },
    ],
    initialDisplayedHeaders: [
      {
        key: '__id_key__',
        name: 'id',
        fieldSchema: { type: 'integer' },
        metadatas: { label: 'id', searchable: true, sortable: true },
      },
    ],
  },
};

export { initialState };
