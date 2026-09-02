import type { Plugin } from '@strapi/types';

const info = { pluginName: 'content-manager', type: 'admin' };

const autosaveRouter: Plugin.LoadedPlugin['routes'][string] = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      info,
      path: '/autosaves/:model/:documentId',
      handler: 'autosave.find',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'PUT',
      info,
      path: '/autosaves/:model/:documentId',
      handler: 'autosave.save',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'DELETE',
      info,
      path: '/autosaves/:model/:documentId',
      handler: 'autosave.delete',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};

export { autosaveRouter };
