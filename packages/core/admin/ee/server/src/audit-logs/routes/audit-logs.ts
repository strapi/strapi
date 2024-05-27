import { enableFeatureMiddleware } from '../../routes/utils';

export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/audit-logs',
      handler: 'audit-logs.findMany',
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
      handler: 'audit-logs.findOne',
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
