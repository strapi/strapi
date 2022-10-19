'use strict';

module.exports = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/config',
      handler: 'upload-config.getConfig',
      config: {
        // TODO add permissions
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'PUT',
      path: '/config',
      handler: 'upload-config.updateConfig',
      config: {
        policies: [
          // TODO add permissions
          'admin::isAuthenticatedAdmin',
        ],
      },
    },
  ],
};
