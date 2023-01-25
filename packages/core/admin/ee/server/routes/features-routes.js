'use strict';

module.exports = {
  sso: [
    {
      method: 'GET',
      path: '/providers',
      handler: 'authentication.getProviders',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/connect/:provider',
      handler: 'authentication.providerLogin',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/connect/:provider',
      handler: 'authentication.providerLogin',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/providers/options',
      handler: 'authentication.getProviderLoginOptions',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          { name: 'admin::hasPermissions', config: { actions: ['admin::provider-login.read'] } },
        ],
      },
    },
    {
      method: 'PUT',
      path: '/providers/options',
      handler: 'authentication.updateProviderLoginOptions',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          { name: 'admin::hasPermissions', config: { actions: ['admin::provider-login.update'] } },
        ],
      },
    },
  ],
  'audit-logs': [
    {
      method: 'GET',
      path: '/audit-logs',
      handler: 'auditLogs.findMany',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['admin::audit-logs.read'],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/audit-logs/:id',
      handler: 'auditLogs.findOne',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['admin::audit-logs.read'],
            },
          },
        ],
      },
    },
  ],
};
