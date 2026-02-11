import { isDevelopmentMode } from '../middlewares';

export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/reserved-names',
      handler: 'builder.getReservedNames',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::content-type-builder.read'] },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/content-types',
      handler: 'content-types.getContentTypes',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::content-type-builder.read'] },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/content-types/:uid',
      handler: 'content-types.getContentType',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::content-type-builder.read'] },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/content-types',
      handler: 'content-types.createContentType',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::content-type-builder.read'] },
          },
        ],
        middlewares: [isDevelopmentMode],
      },
    },
    {
      method: 'PUT',
      path: '/content-types/:uid',
      handler: 'content-types.updateContentType',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::content-type-builder.read'] },
          },
        ],
        middlewares: [isDevelopmentMode],
      },
    },
    {
      method: 'DELETE',
      path: '/content-types/:uid',
      handler: 'content-types.deleteContentType',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::content-type-builder.read'] },
          },
        ],
        middlewares: [isDevelopmentMode],
      },
    },
    {
      method: 'GET',
      path: '/components',
      handler: 'components.getComponents',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::content-type-builder.read'] },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/components/:uid',
      handler: 'components.getComponent',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::content-type-builder.read'] },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/components',
      handler: 'components.createComponent',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::content-type-builder.read'] },
          },
        ],
        middlewares: [isDevelopmentMode],
      },
    },
    {
      method: 'PUT',
      path: '/components/:uid',
      handler: 'components.updateComponent',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::content-type-builder.read'] },
          },
        ],
        middlewares: [isDevelopmentMode],
      },
    },
    {
      method: 'DELETE',
      path: '/components/:uid',
      handler: 'components.deleteComponent',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::content-type-builder.read'] },
          },
        ],
        middlewares: [isDevelopmentMode],
      },
    },
    {
      method: 'PUT',
      path: '/component-categories/:name',
      handler: 'component-categories.editCategory',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::content-type-builder.read'] },
          },
        ],
        middlewares: [isDevelopmentMode],
      },
    },
    {
      method: 'DELETE',
      path: '/component-categories/:name',
      handler: 'component-categories.deleteCategory',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::content-type-builder.read'] },
          },
        ],
        middlewares: [isDevelopmentMode],
      },
    },
    {
      method: 'GET',
      path: '/schema',
      handler: 'schema.getSchema',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::content-type-builder.read'] },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/update-schema',
      handler: 'schema.updateSchema',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::content-type-builder.read'] },
          },
        ],
        middlewares: [isDevelopmentMode],
      },
    },
    {
      method: 'GET',
      path: '/update-schema-status',
      handler: 'schema.getUpdateSchemaStatus',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: { actions: ['plugin::content-type-builder.read'] },
          },
        ],
      },
    },
  ],
};
