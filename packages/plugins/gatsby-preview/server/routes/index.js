'use strict';

module.exports = {
  admin: {
    type: 'admin',
    routes: [
      {
        method: 'GET',
        path: '/settings',
        handler: 'settings.getSettings',
        config: {
          policies: ['admin::isAuthenticatedAdmin'],
        },
      },
      {
        method: 'PUT',
        path: '/previews',
        handler: 'settings.updatePreviews',
        config: {
          policies: ['admin::isAuthenticatedAdmin'],
        },
      },
      {
        method: 'PUT',
        path: '/content-sync-url',
        handler: 'settings.updateContentSyncURL',
        config: {
          policies: ['admin::isAuthenticatedAdmin'],
        },
      },
    ],
  },
};
