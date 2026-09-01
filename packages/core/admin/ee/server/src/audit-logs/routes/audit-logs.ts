import { enableFeatureMiddleware } from '../../routes/utils';

const getRouteConfig = () => ({
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
});

export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/audit-logs',
      handler: 'audit-logs.findMany',
      config: getRouteConfig(),
    },
    {
      method: 'GET',
      path: '/audit-logs/users',
      handler: 'audit-logs.findManyUsers',
      config: getRouteConfig(),
    },
    {
      method: 'GET',
      path: '/audit-logs/:id',
      handler: 'audit-logs.findOne',
      config: getRouteConfig(),
    },
  ],
};
