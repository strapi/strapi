import { describe, expect, it } from 'vitest';
import Router from '@koa/router';
import { RoutePathMigrationError, translateRoutePath } from '../route-path';

describe('translateRoutePath', () => {
  it.each([
    ['/files/(.*)', '/files/{*splat}'],
    ['/files/:path(.*)', '/files/{*path}'],
    ['/users/:id(\\d+)', '/users/:id'],
    ['/posts/:slug([a-z-]+)', '/posts/:slug'],
    ['/users/:id?', '/users{/:id}'],
    ['/users/:id(\\d+)?', '/users{/:id}'],
    ['/files/:path*', '/files{/*path}'],
    ['/files/:path+', '/files/*path'],
    ['/literal(foo)[bar]?+!', '/literal\\(foo\\)\\[bar\\]\\?\\+\\!'],
  ])('translates %s to %s', (path, expectedPath) => {
    expect(translateRoutePath(path)).toMatchObject({ path: expectedPath, changed: true });
  });

  it('does not change a path-to-regexp v8 path', () => {
    expect(translateRoutePath('/articles{/:id}')).toEqual({
      path: '/articles{/:id}',
      changed: false,
      constraints: [],
    });
  });

  it('preserves custom parameter restrictions as route constraints', () => {
    const { constraints } = translateRoutePath('/users/:id(\\d+)');

    expect(constraints).toHaveLength(1);
    expect(constraints[0]).toMatchObject({ name: 'id' });
    expect(constraints[0].pattern.test('123')).toBe(true);
    expect(constraints[0].pattern.test('abc')).toBe(false);
  });

  it.each([
    '/files/(.*)',
    '/files/:path(.*)',
    '/users/:id(\\d+)',
    '/users/:id?',
    '/files/:path*',
    '/files/:path+',
    '/literal(foo)[bar]?+!',
  ])('produces a path accepted by @koa/router for %s', (path) => {
    const router = new Router();

    expect(() => router.get(translateRoutePath(path).path, () => undefined)).not.toThrow();
  });

  it('reports malformed custom parameter patterns clearly', () => {
    expect(() => translateRoutePath('/users/:id(\\d+')).toThrow(RoutePathMigrationError);
    expect(() => translateRoutePath('/users/:id(\\d+')).toThrow(
      'Cannot migrate route path "/users/:id(\\d+" from path-to-regexp v6 to v8'
    );
  });
});
