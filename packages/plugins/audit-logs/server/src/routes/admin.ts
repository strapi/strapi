export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/test',
      handler: 'audit-logs.find',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/',
      handler: 'audit-logs.find',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::audit-logs.read'],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/stats',
      handler: 'audit-logs.stats',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::audit-logs.read'],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/:id',
      handler: 'audit-logs.findOne',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::audit-logs.read'],
            },
          },
        ],
      },
    },
  ],
};

