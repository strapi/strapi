export default {
  admin: {
    type: 'admin',
    routes: [
      {
        method: 'GET',
        path: '/audit-logs',
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
        path: '/audit-logs/stats',
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
        path: '/audit-logs/:id',
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
  },
};

