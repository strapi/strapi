import { describe, expect, it } from 'vitest';
import Router from '@koa/router';
import { RoutePathMigrationError, translateRoutePath } from '../route-path';

describe('translateRoutePath', () => {
  it.each([
    ['/files/(.*)', '/files/{*splat}'],
    ['/files/:path(.*)', '/files/{*path}'],
    ['/files-:path(.*)', '/files-{*path}'],
    ['/files/:path(.*)?', '/files{/*path}'],
    ['/files/:path(.+)', '/files/*path'],
    ['/users/:id(\\d+)', '/users/:id'],
    ['/users/:id(\\d+)?', '/users{/:id}'],
    ['/posts/:slug([a-z-]+)', '/posts/:slug'],
    ['/items/(\\d+)', '/items/:splat'],
    ['/users/:id?', '/users{/:id}'],
    ['/a-:id?', '/a-{:id}'],
    ['/files/:path*', '/files{/*path}'],
    ['/files/:path+', '/files/*path'],
    ['/literal[bar]!', '/literal\\[bar\\]\\!'],
  ])('translates %s to %s', (path, expectedPath) => {
    expect(translateRoutePath(path)).toMatchObject({ path: expectedPath, changed: true });
  });

  it.each(['/articles/:id', '/articles{/:id}', '/files/*path', '/admin{/*path}', '/a\\(b\\)'])(
    'does not change the path-to-regexp v8 path %s',
    (path) => {
      expect(translateRoutePath(path)).toMatchObject({
        path,
        changed: false,
        constraints: [],
        positionalParams: [],
      });
    }
  );

  it('keeps custom parameter patterns as constraints', () => {
    const { constraints } = translateRoutePath('/users/:id(\\d+)');

    expect(constraints).toHaveLength(1);
    expect(constraints[0]).toMatchObject({ name: 'id' });
    expect(constraints[0].pattern.test('123')).toBe(true);
    expect(constraints[0].pattern.test('abc')).toBe(false);
  });

  it('names unnamed groups in order, as v6 numbered them', () => {
    expect(translateRoutePath('/files/(.*)')).toMatchObject({ positionalParams: ['splat'] });
    expect(translateRoutePath('/(\\d+)/(.*)')).toMatchObject({
      path: '/:splat/{*splat2}',
      positionalParams: ['splat', 'splat2'],
    });
  });

  it.each([
    '/files/(.*)',
    '/files/:path(.*)',
    '/files-:path(.*)',
    '/files/:path(.+)',
    '/users/:id(\\d+)?',
    '/items/(\\d+)',
    '/users/:id?',
    '/files/:path*',
    '/files/:path+',
    '/literal[bar]!',
  ])('produces a path accepted by @koa/router for %s', (path) => {
    const router = new Router();

    expect(() => router.get(translateRoutePath(path).path, () => undefined)).not.toThrow();
  });

  it.each([
    ['/items/(a|b)', 'the group "(a|b)" has no v8 equivalent'],
    ['/(?!uploads/).+', 'the group "(?!uploads/)" has no v8 equivalent'],
    ['/files/:path(\\d+)+', 'the repeated parameter ":path" has a custom pattern'],
    ['/users/:id(\\d+', 'is unclosed'],
    ['/users/:id(\\d{2,1})', 'the custom pattern for ":id" is invalid'],
  ])('fails for %s instead of changing what it matches', (path, reason) => {
    expect(() => translateRoutePath(path)).toThrow(RoutePathMigrationError);
    expect(() => translateRoutePath(path)).toThrow(reason);
  });
});
