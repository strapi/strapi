import { describe, it, expect } from 'vitest';

import { createContentApiRoutesFactory } from '../content-api-router';

describe('createContentApiRoutesFactory', () => {
  it('builds content-api routes lazily and caches them', () => {
    let buildCount = 0;
    const factory = createContentApiRoutesFactory(() => {
      buildCount += 1;
      return [{ method: 'GET', path: '/items' }];
    });

    const first = factory();
    const second = factory();

    expect(buildCount).toBe(1);
    expect(first).toEqual({ type: 'content-api', routes: [{ method: 'GET', path: '/items' }] });
    expect(second.routes).toBe(first.routes);
  });

  it('exposes mutable routes property for legacy extensions', () => {
    const factory = createContentApiRoutesFactory(() => [{ method: 'GET', path: '/original' }]);

    expect(factory.routes).toEqual([{ method: 'GET', path: '/original' }]);

    factory.routes = [{ method: 'POST', path: '/replacement' }];

    expect(factory().routes).toEqual([{ method: 'POST', path: '/replacement' }]);
    expect(factory.routes).toEqual([{ method: 'POST', path: '/replacement' }]);
  });
});
