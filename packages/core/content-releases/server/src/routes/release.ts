export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/mapEntriesToReleases',
      handler: 'release.mapEntriesToReleases',
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
      method: 'GET',
      path: '/getByDocumentAttached',
      handler: 'release.findByDocumentAttached',
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
      method: 'POST',
      path: '/',
      handler: 'release.create',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::content-releases.create'],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/',
      handler: 'release.findPage',
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
      method: 'GET',
      path: '/:id',
      handler: 'release.findOne',
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
      path: '/:id',
      handler: 'release.update',
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
      path: '/:id',
      handler: 'release.delete',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::content-releases.delete'],
            },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/:id/publish',
      handler: 'release.publish',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::content-releases.publish'],
            },
          },
        ],
      },
    },
  ],
};
