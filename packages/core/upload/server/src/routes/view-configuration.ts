import type { Core } from '@strapi/types';
import type { Controllers } from '../types/controllers';

// The published type stays the widened one develop infers; `satisfies` checks the literals.
export const routes: {
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
      path: '/configuration',
      handler: 'view-configuration.findViewConfiguration',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'PUT',
      path: '/configuration',
      handler: 'view-configuration.updateViewConfiguration',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::upload.configure-view'],
            },
          },
        ],
      },
    },
  ],
} satisfies Core.RouterInputFor<Controllers, 'plugin::upload'>;
