import { enableFeatureMiddleware } from '../../routes/utils';

const getRouteConfig = (actions: string[] = ['admin::audit-logs.read']) => ({
  middlewares: [enableFeatureMiddleware('audit-logs')],
  policies: [
    'admin::isAuthenticatedAdmin',
    {
      name: 'admin::hasPermissions',
      config: {
        actions,
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
      path: '/audit-logs/export',
      handler: 'audit-logs.export',
      config: getRouteConfig(['admin::audit-logs.read', 'admin::audit-logs.export']),
    },
    {
      method: 'GET',
      path: '/audit-logs/:id',
      handler: 'audit-logs.findOne',
      config: getRouteConfig(),
    },
  ],
};
