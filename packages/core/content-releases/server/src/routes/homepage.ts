import type { Plugin } from '@strapi/types';

const info = { pluginName: 'content-manager', type: 'admin' };

const homepageRouter: Plugin.LoadedPlugin['routes'][string] = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      info,
      path: '/homepage/upcoming-releases',
      handler: 'homepage.getUpcomingReleases',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};

export default homepageRouter;
