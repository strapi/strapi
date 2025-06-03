export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/settings',
      handler: 'settings.find',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::content-releases.settings.read'],
            },
          },
        ],
      },
    },

    {
      method: 'PUT',
      path: '/settings',
      handler: 'settings.update',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::content-releases.settings.update'],
            },
          },
        ],
      },
    },
  ],
};
