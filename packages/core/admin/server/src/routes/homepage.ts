import type { Plugin } from '@strapi/types';

const info = { pluginName: 'admin', type: 'admin' };

export default [
  {
    method: 'GET',
    info,
    path: '/homepage/recent-documents',
    handler: 'homepage.getRecentDocuments',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
] satisfies Plugin.LoadedPlugin['routes'][string]['routes'];
