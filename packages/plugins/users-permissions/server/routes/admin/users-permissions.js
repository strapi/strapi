'use strict';

module.exports = [
  {
    method: 'GET',
    path: '/permissions',
    handler: 'users-permissions.getPermissions',
  },
  {
    method: 'GET',
    path: '/policies',
    handler: 'users-permissions.getPolicies',
  },

  {
    method: 'GET',
    path: '/routes',
    handler: 'users-permissions.getRoutes',
  },
  {
    method: 'GET',
    path: '/email-templates',
    handler: 'users-permissions.getEmailTemplate',
    config: {
      policies: [
        {
          name: 'admin::hasPermissions',
          options: {
            actions: ['plugin::users-permissions.email-templates.read'],
          },
        },
      ],
    },
  },
  {
    method: 'PUT',
    path: '/email-templates',
    handler: 'users-permissions.updateEmailTemplate',
    config: {
      policies: [
        {
          name: 'admin::hasPermissions',
          options: {
            actions: ['plugin::users-permissions.email-templates.update'],
          },
        },
      ],
    },
  },
  {
    method: 'GET',
    path: '/advanced',
    handler: 'users-permissions.getAdvancedSettings',
    config: {
      policies: [
        {
          name: 'admin::hasPermissions',
          options: {
            actions: ['plugin::users-permissions.advanced-settings.read'],
          },
        },
      ],
    },
  },
  {
    method: 'PUT',
    path: '/advanced',
    handler: 'users-permissions.updateAdvancedSettings',
    config: {
      policies: [
        {
          name: 'admin::hasPermissions',
          options: {
            actions: ['plugin::users-permissions.advanced-settings.update'],
          },
        },
      ],
    },
  },
  {
    method: 'GET',
    path: '/providers',
    handler: 'users-permissions.getProviders',
    config: {
      policies: [
        {
          name: 'admin::hasPermissions',
          options: {
            actions: ['plugin::users-permissions.providers.read'],
          },
        },
      ],
    },
  },

  {
    method: 'PUT',
    path: '/providers',
    handler: 'users-permissions.updateProviders',
    config: {
      policies: [
        {
          name: 'admin::hasPermissions',
          options: {
            actions: ['plugin::users-permissions.providers.update'],
          },
        },
      ],
    },
  },
];
