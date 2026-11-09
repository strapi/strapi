import { describe, expect, it } from 'vitest';

import routes from '../index';

const KEEP_V6_ROUTE_PATH = Symbol.for('strapi.route.keepV6Path');

describe('Documentation routes', () => {
  // The core router tests check that this path only matches numeric versions.
  it('serves a versioned documentation from a v6 path that checks each part is a number', () => {
    const route = routes.find(
      ({ handler, path }) => handler === 'documentation.index' && path !== '/'
    );

    expect(route?.path).toBe('/v:major(\\d+).:minor(\\d+).:patch(\\d+)');
    expect((route as Record<symbol, unknown>)[KEEP_V6_ROUTE_PATH]).toBe(true);
  });
});
