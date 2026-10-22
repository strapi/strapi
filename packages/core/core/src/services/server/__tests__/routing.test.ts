import type { Core } from '@strapi/types';

import { validateRouteConfig } from '../routing';

const route = (overrides: Record<string, unknown> = {}) =>
  ({
    method: 'POST',
    path: '/articles',
    handler: 'api::article.article.create',
    ...overrides,
  }) as unknown as Core.RouteInput;

describe('validateRouteConfig', () => {
  it('accepts a route without responseStatus', () => {
    expect(() => validateRouteConfig(route())).not.toThrow();
  });

  it.each([200, 201, 204])('accepts responseStatus %s', (responseStatus) => {
    expect(() => validateRouteConfig(route({ responseStatus }))).not.toThrow();
  });

  it.each([99, 600, 201.5, '201'])('rejects responseStatus %p', (responseStatus) => {
    expect(() => validateRouteConfig(route({ responseStatus }))).toThrow(/Invalid route config/);
  });
});
