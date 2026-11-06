import { describe, expect, it } from 'vitest';

import reviewWorkflows from '../review-workflows';

const KEEP_V6_ROUTE_PATH = Symbol.for('strapi.route.keepV6Path');

describe('Review Workflows routes', () => {
  // The core router tests check these paths against both entry kinds.
  it('serves collection and single type entries from one route each, kept in v6 syntax', () => {
    const entryRoutes = reviewWorkflows.routes.filter(({ path }) =>
      path.startsWith('/content-manager/')
    );

    expect(
      entryRoutes.map((route) => ({
        method: route.method,
        path: route.path,
        handler: route.handler,
        keepsV6Path: (route as Record<symbol, unknown>)[KEEP_V6_ROUTE_PATH],
      }))
    ).toEqual([
      {
        method: 'PUT',
        path: '/content-manager/(collection|single)-types/:model_uid/:id/stage',
        handler: 'stages.updateEntity',
        keepsV6Path: true,
      },
      {
        method: 'GET',
        path: '/content-manager/(collection|single)-types/:model_uid/:id/stages',
        handler: 'stages.listAvailableStages',
        keepsV6Path: true,
      },
      {
        method: 'PUT',
        path: '/content-manager/(collection|single)-types/:model_uid/:id/assignee',
        handler: 'assignees.updateEntity',
        keepsV6Path: true,
      },
    ]);
  });
});
