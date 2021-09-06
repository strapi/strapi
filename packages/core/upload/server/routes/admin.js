'use strict';

module.exports = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/settings',
      handler: 'upload.getSettings',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            options: {
              actions: ['plugin::upload.settings.read'],
            },
          },
        ],
      },
    },
    {
      method: 'PUT',
      path: '/settings',
      handler: 'upload.updateSettings',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            options: {
              actions: ['plugin::upload.settings.read'],
            },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/',
      handler: 'upload.upload',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/files/count',
      handler: 'upload.count',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            options: {
              actions: ['plugin::upload.read'],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/files',
      handler: 'upload.find',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            options: {
              actions: ['plugin::upload.read'],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/files/:id',
      handler: 'upload.findOne',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            options: {
              actions: ['plugin::upload.read'],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/search/:id',
      handler: 'upload.search',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'DELETE',
      path: '/files/:id',
      handler: 'upload.destroy',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            options: {
              actions: ['plugin::upload.assets.update'],
            },
          },
        ],
      },
    },
  ],
};
