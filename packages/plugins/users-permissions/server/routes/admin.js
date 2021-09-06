'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/',
      handler: 'users-permissions.index',
    },
    {
      method: 'GET',
      path: '/search/:id',
      handler: 'users-permissions.searchUsers',
    },
    {
      method: 'GET',
      path: '/policies',
      handler: 'users-permissions.getPolicies',
    },
    {
      method: 'GET',
      path: '/roles/:id',
      handler: 'users-permissions.getRole',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            options: {
              actions: ['plugin::users-permissions.roles.read'],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/roles',
      handler: 'users-permissions.getRoles',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            options: {
              actions: ['plugin::users-permissions.roles.read'],
            },
          },
        ],
      },
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
      path: '/permissions',
      handler: 'users-permissions.getPermissions',
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
    {
      method: 'POST',
      path: '/roles',
      handler: 'users-permissions.createRole',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            options: {
              actions: ['plugin::users-permissions.roles.create'],
            },
          },
        ],
      },
    },
    {
      method: 'PUT',
      path: '/roles/:role',
      handler: 'users-permissions.updateRole',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            options: {
              actions: ['plugin::users-permissions.roles.update'],
            },
          },
        ],
      },
    },
    {
      method: 'DELETE',
      path: '/roles/:role',
      handler: 'users-permissions.deleteRole',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            options: {
              actions: ['plugin::users-permissions.roles.delete'],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/connect/(.*)',
      handler: 'auth.connect',
      config: {
        policies: ['plugin::users-permissions.rateLimit'],
        prefix: '',
      },
    },
    {
      method: 'POST',
      path: '/auth/local',
      handler: 'auth.callback',
      config: {
        policies: ['plugin::users-permissions.rateLimit'],
        prefix: '',
      },
    },
    {
      method: 'POST',
      path: '/auth/local/register',
      handler: 'auth.register',
      config: {
        policies: ['plugin::users-permissions.rateLimit'],
        prefix: '',
      },
    },
    {
      method: 'GET',
      path: '/auth/:provider/callback',
      handler: 'auth.callback',
      config: {
        prefix: '',
      },
    },
    {
      method: 'POST',
      path: '/auth/forgot-password',
      handler: 'auth.forgotPassword',
      config: {
        policies: ['plugin::users-permissions.rateLimit'],
        prefix: '',
      },
    },
    {
      method: 'POST',
      path: '/auth/reset-password',
      handler: 'auth.resetPassword',
      config: {
        policies: ['plugin::users-permissions.rateLimit'],
        prefix: '',
      },
    },
    {
      method: 'GET',
      path: '/auth/email-confirmation',
      handler: 'auth.emailConfirmation',
      config: {
        prefix: '',
      },
    },
    {
      method: 'POST',
      path: '/auth/send-email-confirmation',
      handler: 'auth.sendEmailConfirmation',
      config: {
        prefix: '',
      },
    },
    {
      method: 'GET',
      path: '/users/count',
      handler: 'user.count',
      config: {
        prefix: '',
      },
    },
    {
      method: 'GET',
      path: '/users',
      handler: 'user.find',
      config: {
        prefix: '',
      },
    },
    {
      method: 'GET',
      path: '/users/me',
      handler: 'user.me',
      config: {
        prefix: '',
      },
    },
    {
      method: 'GET',
      path: '/users/:id',
      handler: 'user.findOne',
      config: {
        prefix: '',
      },
    },
    {
      method: 'POST',
      path: '/users',
      handler: 'user.create',
      config: {
        prefix: '',
      },
    },
    {
      method: 'PUT',
      path: '/users/:id',
      handler: 'user.update',
      config: {
        prefix: '',
      },
    },
    {
      method: 'DELETE',
      path: '/users/:id',
      handler: 'user.destroy',
      config: {
        prefix: '',
      },
    },
  ],
};
