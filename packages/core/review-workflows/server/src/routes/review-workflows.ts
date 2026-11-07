import { enableFeatureMiddleware } from './utils';

// `(collection|single)` is no longer a router constraint. Reject any other kind here.
export const onlyCollectionOrSingleKind = (
  ctx: { params: { 0?: string }; status: number },
  next: () => unknown
) => {
  if (ctx.params[0] !== 'collection' && ctx.params[0] !== 'single') {
    ctx.status = 404;
    return;
  }

  return next();
};

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
      // Kept in v6 syntax so ctx.params[0] and the API documentation stay as they were.
      [Symbol.for('strapi.route.keepV6Path')]: true,
      path: '/content-manager/(collection|single)-types/:model_uid/:id/stage',
      handler: 'stages.updateEntity',
      config: {
        middlewares: [enableFeatureMiddleware('review-workflows'), onlyCollectionOrSingleKind],
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      // Kept in v6 syntax so ctx.params[0] and the API documentation stay as they were.
      [Symbol.for('strapi.route.keepV6Path')]: true,
      path: '/content-manager/(collection|single)-types/:model_uid/:id/stages',
      handler: 'stages.listAvailableStages',
      config: {
        middlewares: [enableFeatureMiddleware('review-workflows'), onlyCollectionOrSingleKind],
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'PUT',
      // Kept in v6 syntax so ctx.params[0] and the API documentation stay as they were.
      [Symbol.for('strapi.route.keepV6Path')]: true,
      path: '/content-manager/(collection|single)-types/:model_uid/:id/assignee',
      handler: 'assignees.updateEntity',
      config: {
        middlewares: [enableFeatureMiddleware('review-workflows'), onlyCollectionOrSingleKind],
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
