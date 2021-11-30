'use strict';

module.exports = [
  {
    method: 'POST',
    path: '/users/batch-delete',
    handler: 'user.deleteMany',
    config: {
      policies: [{ name: 'admin::hasPermissions', config: { actions: ['admin::users.delete'] } }],
    },
  },
  {
    method: 'GET',
    path: '/roles/:id/permissions',
    handler: 'role.getPermissions',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::roles.read'] } },
      ],
    },
  },
  {
    method: 'PUT',
    path: '/roles/:id/permissions',
    handler: 'role.updatePermissions',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::roles.update'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/roles/:id',
    handler: 'role.findOne',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::roles.read'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/roles',
    handler: 'role.findAll',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::roles.read'] } },
      ],
    },
  },
  {
    method: 'PUT',
    path: '/roles/:id',
    handler: 'role.update',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::roles.update'] } },
      ],
    },
  },
];
