'use strict';

module.exports = [
  {
    method: 'POST',
    path: '/api-tokens',
    handler: 'api-token.create',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', options: { actions: ['admin::api-tokens.create'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/api-tokens',
    handler: 'api-token.list',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', options: { actions: ['admin::api-tokens.read'] } },
      ],
    },
  },
];
