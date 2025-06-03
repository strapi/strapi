import { enableFeatureMiddleware } from './utils';

export default {
  type: 'admin',
  routes: [
    // Review workflow
    {
      method: 'POST',
      path: '/workflows',
      handler: 'workflows.create',
      config: {
        middlewares: [enableFeatureMiddleware('review-workflows')],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['admin::review-workflows.create'],
            },
          },
        ],
      },
    },
    {
      method: 'PUT',
      path: '/workflows/:id',
      handler: 'workflows.update',
      config: {
        middlewares: [enableFeatureMiddleware('review-workflows')],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['admin::review-workflows.update'],
            },
          },
        ],
      },
    },
    {
      method: 'DELETE',
      path: '/workflows/:id',
      handler: 'workflows.delete',
      config: {
        middlewares: [enableFeatureMiddleware('review-workflows')],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['admin::review-workflows.delete'],
            },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/workflows',
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
      path: '/workflows/:workflow_id/stages',
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
      method: 'GET',
      path: '/workflows/:workflow_id/stages/:id',
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
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/content-manager/(collection|single)-types/:model_uid/:id/stages',
      handler: 'stages.listAvailableStages',
      config: {
        middlewares: [enableFeatureMiddleware('review-workflows')],
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'PUT',
      path: '/content-manager/(collection|single)-types/:model_uid/:id/assignee',
      handler: 'assignees.updateEntity',
      config: {
        middlewares: [enableFeatureMiddleware('review-workflows')],
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['admin::users.read'],
            },
          },
        ],
      },
    },
  ],
};
