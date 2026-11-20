import type { Core } from '@strapi/types';
import type { Controllers } from '../types/controllers';

// The published type stays the widened one develop infers; `satisfies` checks the literals.
const settingsRouter: {
  type: string;
  routes: {
    method: string;
    path: string;
    handler: string;
    config: {
      policies: (string | { name: string; config: { actions: string[] } })[];
    };
  }[];
} = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/settings',
      handler: 'settings.find',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::content-releases.settings.read'],
            },
          },
        ],
      },
    },

    {
      method: 'PUT',
      path: '/settings',
      handler: 'settings.update',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::content-releases.settings.update'],
            },
          },
        ],
      },
    },
  ],
} satisfies Core.RouterInputFor<Controllers, 'plugin::content-releases'>;

export default settingsRouter;
