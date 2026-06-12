import type { Plugin } from '@strapi/types';

const info = { pluginName: 'content-manager', type: 'admin' };

const homepageRouter: Plugin.LoadedPlugin['routes'][string] = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      info,
      path: '/homepage/recent-documents',
      handler: 'homepage.getRecentDocuments',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      info,
      path: '/homepage/count-documents',
      handler: 'homepage.getCountDocuments',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};

export { homepageRouter };
