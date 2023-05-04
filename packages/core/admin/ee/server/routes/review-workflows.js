'use strict';

const { enableFeatureMiddleware } = require('./utils');

module.exports = {
  type: 'admin',
  routes: [
    // Review workflow
    {
      method: 'GET',
      path: '/review-workflows/workflows',
      handler: 'workflows.find',
      config: {
        middlewares: [enableFeatureMiddleware('review-workflows')],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['admin::review-workflows.read'],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/review-workflows/workflows/:id',
      handler: 'workflows.findById',
      config: {
        middlewares: [enableFeatureMiddleware('review-workflows')],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['admin::review-workflows.read'],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/review-workflows/workflows/:workflow_id/stages',
      handler: 'stages.find',
      config: {
        middlewares: [enableFeatureMiddleware('review-workflows')],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['admin::review-workflows.read'],
            },
          },
        ],
      },
    },
    {
      method: 'PUT',
      path: '/review-workflows/workflows/:workflow_id/stages',
      handler: 'stages.replace',
      config: {
        middlewares: [enableFeatureMiddleware('review-workflows')],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['admin::review-workflows.read'],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/review-workflows/workflows/:workflow_id/stages/:id',
      handler: 'stages.findById',
      config: {
        middlewares: [enableFeatureMiddleware('review-workflows')],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['admin::review-workflows.read'],
            },
          },
        ],
      },
    },
    {
      method: 'PUT',
      path: '/content-manager/(collection|single)-types/:model_uid/:id/stage',
      handler: 'stages.updateEntity',
      config: {
        middlewares: [enableFeatureMiddleware('review-workflows')],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['admin::review-workflows.read'],
            },
          },
        ],
      },
    },
  ],
};
