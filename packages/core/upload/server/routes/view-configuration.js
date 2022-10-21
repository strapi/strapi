'use strict';

module.exports = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/configuration',
      handler: 'view-configuration.getViewConfiguration',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'PUT',
      path: '/configuration',
      handler: 'view-configuration.updateViewConfiguration',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::upload.configure-view'],
            },
          },
        ],
      },
    },
  ],
};
