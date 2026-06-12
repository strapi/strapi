import type { Core } from '@strapi/types';

import { RouteMatcher } from '../../src/routes';

describe('RouteMatcher', () => {
  it('should correctly match a route', () => {
    // Arrange
    const matcher = new RouteMatcher([(route) => route.path === '/users/123']);
    const route: Core.Route = {
      path: '/users/123',
      method: 'GET',
      info: { type: 'content-api' },
      handler: '',
    };

    // Act
    const matchResult = matcher.match(route);

    // Assert
    expect(matchResult).toBeTruthy();
  });

  it(`should not match a route it doesn't pass the rules validation`, () => {
    // Arrange
    const matcher = new RouteMatcher([(route) => route.path === '/users/123']);
    const route: Core.Route = {
      path: '/products/123',
      method: 'GET',
      info: { type: 'content-api' },
      handler: '',
    };

    // Act
    const matchResult = matcher.match(route);

    // Assert
    expect(matchResult).toBeFalsy();
  });

  it('should match routes with query parameters correctly using multiple rules', () => {
    // Arrange
    const matcher = new RouteMatcher([
      (route) => route.path.startsWith('/search'),
      (route) => route.method === 'GET',
    ]);
    const route: Core.Route = {
      path: '/search?query=example',
      method: 'GET',
      info: { type: 'content-api' },
      handler: '',
    };

    // Act
    const matchResult = matcher.match(route);

    // Assert
    expect(matchResult).toBeTruthy();
  });

  it('should fail to match if any rule fails', () => {
    // Arrange
    const matcher = new RouteMatcher([
      (route) => route.path.startsWith('/search'),
      (route) => route.method === 'POST',
    ]);
    const route: Core.Route = {
      path: '/search?query=example',
      method: 'GET',
      info: { type: 'content-api' },
      handler: '',
    };

    // Act
    const matchResult = matcher.match(route);

    // Assert
    expect(matchResult).toBeFalsy();
  });
});
