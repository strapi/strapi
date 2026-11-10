import type { Core } from '@strapi/types';
import type { Controllers } from '../types/controllers';

// The published type stays the widened one develop infers; `satisfies` checks the literals.
const routes: {
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
      method: 'POST',
      path: '/',
      handler: 'email.send',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'POST',
      path: '/test',
      handler: 'email.test',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          { name: 'admin::hasPermissions', config: { actions: ['plugin::email.settings.read'] } },
        ],
      },
    },
    {
      method: 'GET',
      path: '/settings',
      handler: 'email.getSettings',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          { name: 'admin::hasPermissions', config: { actions: ['plugin::email.settings.read'] } },
        ],
      },
    },
    {
      method: 'POST',
      path: '/verify',
      handler: 'email.verify',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          { name: 'admin::hasPermissions', config: { actions: ['plugin::email.settings.read'] } },
        ],
      },
    },
  ],
} satisfies Core.RouterInputFor<Controllers, 'plugin::email'>;

export default routes;
