import { routing } from '../middlewares';

export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/init',
      handler: 'init.getInitData',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/content-types',
      handler: 'content-types.findContentTypes',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/content-types-settings',
      handler: 'content-types.findContentTypesSettings',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/content-types/:uid/configuration',
      handler: 'content-types.findContentTypeConfiguration',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/content-types/:uid/configuration',
      handler: 'content-types.updateContentTypeConfiguration',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },

    {
      method: 'GET',
      path: '/components',
      handler: 'components.findComponents',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/components/:uid/configuration',
      handler: 'components.findComponentConfiguration',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/components/:uid/configuration',
      handler: 'components.updateComponentConfiguration',
      config: {
        policies: [],
      },
    },

    {
      method: 'POST',
      path: '/uid/generate',
      handler: 'uid.generateUID',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/uid/check-availability',
      handler: 'uid.checkUIDAvailability',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/relations/:model/:targetField',
      handler: 'relations.findAvailable',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/relations/:model/:id/:targetField',
      handler: 'relations.findExisting',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/single-types/:model',
      handler: 'single-types.find',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.read'] },
          },
        ],
      },
    },
    {
      method: 'PUT',
      path: '/single-types/:model',
      handler: 'single-types.createOrUpdate',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: {
              actions: [
                'plugin::content-manager.explorer.create',
                'plugin::content-manager.explorer.update',
              ],
              hasAtLeastOne: true,
            },
          },
        ],
      },
    },
    {
      method: 'DELETE',
      path: '/single-types/:model',
      handler: 'single-types.delete',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.delete'] },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/single-types/:model/actions/publish',
      handler: 'single-types.publish',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.publish'] },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/single-types/:model/actions/unpublish',
      handler: 'single-types.unpublish',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.publish'] },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/single-types/:model/actions/discard',
      handler: 'single-types.discard',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.update'] },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/single-types/:model/actions/countDraftRelations',
      handler: 'single-types.countDraftRelations',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.read'] },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/collection-types/:model',
      handler: 'collection-types.find',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.read'] },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/collection-types/:model',
      handler: 'collection-types.create',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.create'] },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/collection-types/:model/clone/:sourceId',
      handler: 'collection-types.clone',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.create'] },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/collection-types/:model/auto-clone/:sourceId',
      handler: 'collection-types.autoClone',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.create'] },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/collection-types/:model/:id',
      handler: 'collection-types.findOne',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.read'] },
          },
        ],
      },
    },
    {
      method: 'PUT',
      path: '/collection-types/:model/:id',
      handler: 'collection-types.update',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.update'] },
          },
        ],
      },
    },
    {
      method: 'DELETE',
      path: '/collection-types/:model/:id',
      handler: 'collection-types.delete',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.delete'] },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/collection-types/:model/actions/publish',
      handler: 'collection-types.publish',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.publish'] },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/collection-types/:model/:id/actions/publish',
      handler: 'collection-types.publish',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.publish'] },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/collection-types/:model/:id/actions/unpublish',
      handler: 'collection-types.unpublish',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.publish'] },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/collection-types/:model/:id/actions/discard',
      handler: 'collection-types.discard',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.update'] },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/collection-types/:model/actions/bulkDelete',
      handler: 'collection-types.bulkDelete',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.delete'] },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/collection-types/:model/actions/bulkPublish',
      handler: 'collection-types.bulkPublish',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.publish'] },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/collection-types/:model/actions/bulkUnpublish',
      handler: 'collection-types.bulkUnpublish',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.publish'] },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/collection-types/:model/:id/actions/countDraftRelations',
      handler: 'collection-types.countDraftRelations',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.read'] },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/collection-types/:model/actions/countManyEntriesDraftRelations',
      handler: 'collection-types.countManyEntriesDraftRelations',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.read'] },
          },
        ],
      },
    },
  ],
};
