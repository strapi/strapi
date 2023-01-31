'use strict';

const { features } = require('@strapi/strapi/lib/utils/ee');

const enableFeatureMiddleware = (featureName) => (ctx, next) => {
  if (features.isEnabled(featureName)) {
    return next();
  }

  ctx.status = 404;
};

module.exports = [
  {
    method: 'POST',
    path: '/roles',
    handler: 'role.create',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        {
          name: 'admin::hasPermissions',
          config: {
            actions: ['admin::roles.create'],
          },
        },
      ],
    },
  },
  {
    method: 'DELETE',
    path: '/roles/:id',
    handler: 'role.deleteOne',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        {
          name: 'admin::hasPermissions',
          config: {
            actions: ['admin::roles.delete'],
          },
        },
      ],
    },
  },
  {
    method: 'POST',
    path: '/roles/batch-delete',
    handler: 'role.deleteMany',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        {
          name: 'admin::hasPermissions',
          config: {
            actions: ['admin::roles.delete'],
          },
        },
      ],
    },
  },

  // SSO
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

  // Audit logs
  {
    method: 'GET',
    path: '/audit-logs',
    handler: 'auditLogs.findMany',
    config: {
      middlewares: [enableFeatureMiddleware('audit-logs')],
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
      middlewares: [enableFeatureMiddleware('audit-logs')],
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

  // Review workflow
  {
    method: 'GET',
    path: '/review-workflows/workflows',
    handler: 'workflows.find',
    config: {
      middlewares: [enableFeatureMiddleware('review-workflows')],
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
  {
    method: 'GET',
    path: '/review-workflows/workflows/:id',
    handler: 'workflows.findOne',
    config: {
      middlewares: [enableFeatureMiddleware('review-workflows')],
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
  {
    method: 'GET',
    path: '/review-workflows/workflows/:workflow_id/stages',
    handler: 'stages.find',
    config: {
      middlewares: [enableFeatureMiddleware('review-workflows')],
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
  {
    method: 'GET',
    path: '/review-workflows/workflows/:workflow_id/stages/:stage_id',
    handler: 'stages.findOne',
    config: {
      middlewares: [enableFeatureMiddleware('review-workflows')],
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
];
