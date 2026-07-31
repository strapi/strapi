'use strict';

module.exports = [
  {
    method: 'GET',
    path: '/permissions',
    handler: 'permissions.getPermissions',
  },
  {
    method: 'GET',
    path: '/policies',
    handler: 'permissions.getPolicies',
  },

  {
    method: 'GET',
    path: '/routes',
    handler: 'permissions.getRoutes',
  },
];
