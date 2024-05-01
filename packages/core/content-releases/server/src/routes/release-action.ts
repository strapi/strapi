export default {
  type: 'admin',
  routes: [
    {
      method: 'POST',
      path: '/:releaseId/actions',
      handler: 'release-action.create',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::content-releases.create-action'],
            },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/:releaseId/actions/bulk',
      handler: 'release-action.createMany',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::content-releases.create-action'],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/:releaseId/actions',
      handler: 'release-action.findMany',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::content-releases.read'],
            },
          },
        ],
      },
    },
    {
      method: 'PUT',
      path: '/:releaseId/actions/:actionId',
      handler: 'release-action.update',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::content-releases.update'],
            },
          },
        ],
      },
    },
    {
      method: 'DELETE',
      path: '/:releaseId/actions/:actionId',
      handler: 'release-action.delete',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::content-releases.delete-action'],
            },
          },
        ],
      },
    },
  ],
};
