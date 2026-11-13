import { describe, expect, test } from 'vitest';

import routes from '../review-workflows';

describe('review workflow routes', () => {
  test('content-manager entry routes keep one alternation path', () => {
    const entryRoutes = routes.routes.filter((route) =>
      String(route.path).includes('(collection|single)-types')
    );

    expect(entryRoutes.map((route) => `${route.method} ${route.path}`)).toEqual([
      'PUT /content-manager/(collection|single)-types/:model_uid/:id/stage',
      'GET /content-manager/(collection|single)-types/:model_uid/:id/stages',
      'PUT /content-manager/(collection|single)-types/:model_uid/:id/assignee',
    ]);
  });
});
