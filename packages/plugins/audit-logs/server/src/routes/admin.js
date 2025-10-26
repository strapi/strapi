'use strict';

module.exports = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/',
      handler: 'audit-log.find',
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
      path: '/statistics',
      handler: 'audit-log.getStatistics',
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
      handler: 'audit-log.findOne',
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
