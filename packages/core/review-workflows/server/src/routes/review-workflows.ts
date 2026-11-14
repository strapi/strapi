import { enableFeatureMiddleware } from './utils';

const contentManagerEntryRoute = (
  method: 'GET' | 'PUT',
  action: 'stage' | 'stages' | 'assignee',
  handler: string,
  policies: Array<string | { name: string; config?: { actions: string[] } }>
) => ({
  method,
  path: `/content-manager/(collection|single)-types/:model_uid/:id/${action}`,
  handler,
  config: {
    middlewares: [enableFeatureMiddleware('review-workflows')],
    policies,
  },
});

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
    contentManagerEntryRoute('PUT', 'stage', 'stages.updateEntity', [
      'admin::isAuthenticatedAdmin',
    ]),
    contentManagerEntryRoute('GET', 'stages', 'stages.listAvailableStages', [
      'admin::isAuthenticatedAdmin',
    ]),
    contentManagerEntryRoute('PUT', 'assignee', 'assignees.updateEntity', [
      'admin::isAuthenticatedAdmin',
      {
        name: 'admin::hasPermissions',
        config: {
          actions: ['admin::users.read'],
        },
      },
    ]),
  ],
};
