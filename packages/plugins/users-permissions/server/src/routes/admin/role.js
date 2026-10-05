'use strict';

module.exports = [
  {
    method: 'GET',
    path: '/roles/:id',
    handler: 'role.findOne',
    config: {
      policies: [
        {
          name: 'admin::hasPermissions',
          config: {
            actions: ['plugin::users-permissions.roles.read'],
          },
        },
      ],
    },
  },
  {
    method: 'GET',
    path: '/roles',
    handler: 'role.find',
    config: {
      policies: [
        {
          name: 'admin::hasPermissions',
          config: {
            actions: ['plugin::users-permissions.roles.read'],
          },
        },
      ],
    },
  },
  {
    method: 'POST',
    path: '/roles',
    handler: 'role.createRole',
    config: {
      policies: [
        {
          name: 'admin::hasPermissions',
          config: {
            actions: ['plugin::users-permissions.roles.create'],
          },
        },
      ],
    },
  },
  {
    method: 'PUT',
    path: '/roles/:role',
    handler: 'role.updateRole',
    config: {
      policies: [
        {
          name: 'admin::hasPermissions',
          config: {
            actions: ['plugin::users-permissions.roles.update'],
          },
        },
      ],
    },
  },
  {
    method: 'DELETE',
    path: '/roles/:role',
    handler: 'role.deleteRole',
    config: {
      policies: [
        {
          name: 'admin::hasPermissions',
          config: {
            actions: ['plugin::users-permissions.roles.delete'],
          },
        },
      ],
    },
  },
];
