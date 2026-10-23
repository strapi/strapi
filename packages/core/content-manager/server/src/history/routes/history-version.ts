import type { Core, Plugin } from '@strapi/types';
import type { RouteControllers } from '../../types/controllers';

const info = { pluginName: 'content-manager', type: 'admin' };

const historyVersionRouter: Plugin.LoadedPlugin['routes'][string] = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      info,
      path: '/history-versions',
      handler: 'history-version.findMany',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'PUT',
      info,
      path: '/history-versions/:versionId/restore',
      handler: 'history-version.restoreVersion',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
} satisfies Core.RouterInputFor<RouteControllers, 'plugin::content-manager'>;

export { historyVersionRouter };
