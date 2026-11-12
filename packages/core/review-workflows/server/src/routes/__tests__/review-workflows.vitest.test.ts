import { describe, expect, it } from 'vitest';

import reviewWorkflows from '../review-workflows';

describe('Review Workflows routes', () => {
  it('serves collection and single type entries on separate routes', () => {
    const entryRoutes = reviewWorkflows.routes.filter(({ path }) =>
      path.startsWith('/content-manager/')
    );

    expect(
      entryRoutes.map((route) => ({
        method: route.method,
        path: route.path,
        handler: route.handler,
      }))
    ).toEqual([
      {
        method: 'PUT',
        path: '/content-manager/collection-types/:model_uid/:id/stage',
        handler: 'stages.updateEntity',
      },
      {
        method: 'PUT',
        path: '/content-manager/single-types/:model_uid/:id/stage',
        handler: 'stages.updateEntity',
      },
      {
        method: 'GET',
        path: '/content-manager/collection-types/:model_uid/:id/stages',
        handler: 'stages.listAvailableStages',
      },
      {
        method: 'GET',
        path: '/content-manager/single-types/:model_uid/:id/stages',
        handler: 'stages.listAvailableStages',
      },
      {
        method: 'PUT',
        path: '/content-manager/collection-types/:model_uid/:id/assignee',
        handler: 'assignees.updateEntity',
      },
      {
        method: 'PUT',
        path: '/content-manager/single-types/:model_uid/:id/assignee',
        handler: 'assignees.updateEntity',
      },
    ]);
  });
});
