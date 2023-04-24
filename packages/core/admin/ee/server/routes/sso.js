'use strict';

const { enableFeatureMiddleware } = require('./utils');

module.exports = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/providers',
      handler: 'authentication.getProviders',
      config: {
        middlewares: [enableFeatureMiddleware('sso')],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/connect/:provider',
      handler: 'authentication.providerLogin',
      config: {
        middlewares: [enableFeatureMiddleware('sso')],
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/connect/:provider',
      handler: 'authentication.providerLogin',
      config: {
        middlewares: [enableFeatureMiddleware('sso')],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/providers/options',
      handler: 'authentication.getProviderLoginOptions',
      config: {
        middlewares: [enableFeatureMiddleware('sso')],
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
        middlewares: [enableFeatureMiddleware('sso')],
        policies: [
          'admin::isAuthenticatedAdmin',
          { name: 'admin::hasPermissions', config: { actions: ['admin::provider-login.update'] } },
        ],
      },
    },
  ],
};
