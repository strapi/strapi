import type { Plugin } from '@strapi/types';

import { routing } from '../../middlewares';

const info = { pluginName: 'content-manager', type: 'admin' };

const customOrderRouter: Plugin.LoadedPlugin['routes'][string] = {
  type: 'admin',
  routes: [
    {
      method: 'POST',
      info,
      path: '/collection-types/:model/:id/actions/move',
      handler: 'custom-order.move',
      config: {
        middlewares: [routing],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::content-manager.explorer.update'] },
          },
        ],
      },
    },
  ],
};

export { customOrderRouter };
