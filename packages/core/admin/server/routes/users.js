'use strict';

module.exports = [
  {
    method: 'GET',
    path: '/users/me',
    handler: 'authenticated-user.getMe',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
  {
    method: 'PUT',
    path: '/users/me',
    handler: 'authenticated-user.updateMe',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
  {
    method: 'GET',
    path: '/users/me/permissions',
    handler: 'authenticated-user.getOwnPermissions',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
  {
    method: 'POST',
    path: '/users',
    handler: 'user.create',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::users.create'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/users',
    handler: 'user.find',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::users.read'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/users/:id',
    handler: 'user.findOne',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::users.read'] } },
      ],
    },
  },
  {
    method: 'PUT',
    path: '/users/:id',
    handler: 'user.update',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::users.update'] } },
      ],
    },
  },
  {
    method: 'DELETE',
    path: '/users/:id',
    handler: 'user.deleteOne',
    config: {
      policies: [{ name: 'admin::hasPermissions', config: { actions: ['admin::users.delete'] } }],
    },
  },
  {
    method: 'POST',
    path: '/users/batch-delete',
    handler: 'user.deleteMany',
    config: {
      policies: [{ name: 'admin::hasPermissions', config: { actions: ['admin::users.delete'] } }],
    },
  },
];
