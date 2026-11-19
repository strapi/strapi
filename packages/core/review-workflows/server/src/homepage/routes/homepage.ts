import type { Core, Plugin } from '@strapi/types';
import type { Controllers } from '../../types/controllers';

const info = { pluginName: 'content-manager', type: 'admin' };

const homepageRouter: Plugin.LoadedPlugin['routes'][string] = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      info,
      path: '/homepage/recently-assigned-documents',
      handler: 'homepage.getRecentlyAssignedDocuments',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
} satisfies Core.RouterInputFor<Controllers, 'plugin::review-workflows'>;

export { homepageRouter };
