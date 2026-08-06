import type { Context } from 'koa';

import { resolveRouteTemplate } from '../koa-route-template';

describe('resolveRouteTemplate', () => {
  it('prefers string _matchedRoute', () => {
    const ctx = {
      path: '/api/123',
      _matchedRoute: '/api/:id',
    } as unknown as Context;

    expect(resolveRouteTemplate(ctx)).toBe('/api/:id');
  });

  it('falls back to routerPath', () => {
    const ctx = {
      path: '/x',
      routerPath: '/items',
    } as unknown as Context;

    expect(resolveRouteTemplate(ctx)).toBe('/items');
  });

  it('uses path when no template', () => {
    const ctx = { path: '/raw' } as unknown as Context;
    expect(resolveRouteTemplate(ctx)).toBe('/raw');
  });
});
