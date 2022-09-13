'use strict';

module.exports = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/settings',
      handler: 'admin-settings.getSettings',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::upload.settings.read'],
            },
          },
        ],
      },
    },
    {
      method: 'PUT',
      path: '/settings',
      handler: 'admin-settings.updateSettings',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::upload.settings.read'],
            },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/',
      handler: 'admin-upload.upload',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/files',
      handler: 'admin-file.find',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::upload.read'],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/files/:id',
      handler: 'admin-file.findOne',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::upload.read'],
            },
          },
        ],
      },
    },
    {
      method: 'DELETE',
      path: '/files/:id',
      handler: 'admin-file.destroy',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::upload.assets.update'],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/folders/:id',
      handler: 'admin-folder.findOne',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::upload.read'],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/folders',
      handler: 'admin-folder.find',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::upload.read'],
            },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/folders',
      handler: 'admin-folder.create',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::upload.assets.create'],
            },
          },
        ],
      },
    },
    {
      method: 'PUT',
      path: '/folders/:id',
      handler: 'admin-folder.update',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::upload.assets.update'],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/folder-structure',
      handler: 'admin-folder.getStructure',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::upload.read'],
            },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/actions/bulk-delete',
      handler: 'admin-folder-file.deleteMany',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::upload.assets.update'],
            },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/actions/bulk-move',
      handler: 'admin-folder-file.moveMany',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::upload.assets.update'],
            },
          },
        ],
      },
    },
  ],
};
