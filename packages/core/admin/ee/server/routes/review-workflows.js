'use strict';

const { enableFeatureMiddleware } = require('./utils');

const CONTENT_API_PREFIX = 'strapi-workflows';

module.exports = [
  {
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
  },
  {
    type: 'content-api',
    prefix: `/${CONTENT_API_PREFIX}`,
    routes: [
      {
        method: 'GET',
        path: '/',
        handler: 'content-api-workflows.find',
        config: {
          middlewares: [enableFeatureMiddleware('review-workflows')],
          policies: [],
        },
      },
      {
        method: 'GET',
        path: '/:id',
        handler: 'content-api-workflows.findById',
        config: {
          middlewares: [enableFeatureMiddleware('review-workflows')],
          policies: [],
        },
      },
      {
        method: 'GET',
        path: '/:workflow_id/stages/:id',
        handler: 'content-api-stages.findById',
        config: {
          middlewares: [enableFeatureMiddleware('review-workflows')],
          policies: [],
        },
      },
      {
        method: 'PUT',
        path: '/:workflow_id/stages/:id',
        handler: 'content-api-stages.updateOne',
        config: {
          middlewares: [enableFeatureMiddleware('review-workflows')],
          policies: [],
        },
      },
      {
        method: 'PUT',
        path: '/:workflow_id/stages',
        handler: 'content-api-stages.replace',
        config: {
          middlewares: [enableFeatureMiddleware('review-workflows')],
          policies: [],
        },
      },
      {
        method: 'POST',
        path: '/:workflow_id/stages',
        handler: 'content-api-stages.create',
        config: {
          middlewares: [enableFeatureMiddleware('review-workflows')],
          policies: [],
        },
      },
    ],
  },
];
