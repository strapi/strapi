import type { Plugin } from '@strapi/types';

const info = { pluginName: 'content-manager', type: 'admin' };

const previewRouter: Plugin.LoadedPlugin['routes'][string] = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      info,
      path: '/preview/url/:contentType',
      handler: 'preview.getPreviewUrl',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};

export { previewRouter };
