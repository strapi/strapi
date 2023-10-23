'use strict';

const { enableFeatureMiddleware } = require('./utils');

module.exports = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/audit-logs',
      handler: 'auditLogs.findMany',
      config: {
        middlewares: [enableFeatureMiddleware('audit-logs')],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['admin::audit-logs.read'],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/audit-logs/:id',
      handler: 'auditLogs.findOne',
      config: {
        middlewares: [enableFeatureMiddleware('audit-logs')],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['admin::audit-logs.read'],
            },
          },
        ],
      },
    },
  ],
};
