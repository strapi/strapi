'use strict';

module.exports = [
  {
    method: 'GET',
    path: '/content-api/permissions',
    handler: 'content-api.getPermissions',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
  {
    method: 'GET',
    path: '/content-api/routes',
    handler: 'content-api.getRoutes',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
];
