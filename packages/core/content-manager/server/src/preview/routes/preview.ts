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
    {
      method: 'GET',
      info,
      path: '/preview/script',
      handler: 'preview.getPreviewScript',
      // Public: the script is non-sensitive (it runs on the user's public site) and
      // is convenience-fetched by the admin to inject into the preview iframe.
      config: {
        auth: false,
      },
    },
  ],
};

export { previewRouter };
