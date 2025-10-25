export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/logs',
      handler: 'audit-logs.find',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/logs/stats',
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
      path: '/logs/:id',
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

