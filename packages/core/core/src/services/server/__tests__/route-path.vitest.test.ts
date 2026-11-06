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
    ['/files/:path([!-~]+)', '/files/*path'],
    ['/users/:id(\\d+)', '/users/:id'],
    ['/users/:id(\\d+)?', '/users{/:id}'],
    ['/posts/:slug([a-z-]+)', '/posts/:slug'],
    ['/items/(\\d+)', '/items/:splat'],
    ['/users/:id?', '/users{/:id}'],
    ['/a-:id?', '/a-{:id}'],
    ['/files/:path*', '/files{/*path}'],
    ['/files/:path+', '/files/*path'],
    ['/literal[bar]!', '/literal\\[bar\\]\\!'],
    ['/items/(a|b)', '/items/:splat'],
    ['/content-manager/(collection|single)-types/:id', '/content-manager/:splat-types/:id'],
    ['/files/:path(\\d+)+', '/files/*path'],
    ['/files/:path(\\d+)*', '/files{/*path}'],
    ['/users/:404', '/users/:"404"'],
    ['/files/:id$name', '/files/:"id"$name'],
    ['/users/:café', '/users/:"caf"é'],
    ['/:attr1?{-:attr2}?{-:attr3}?', '{/:attr1}{-:attr2}{-:attr3}'],
    ['/users{/:id(\\d+)}?', '/users{/:id}'],
    ['{:id(\\d+)}', ':id'],
    ['{ab}?', '{ab}'],
    ['/x{ab}+', '/x:v6Literal0'],
  ])('translates %s to %s', (path, expectedPath) => {
    expect(translateRoutePath(path)).toMatchObject({ path: expectedPath, changed: true });
  });

  it.each([
    '/articles/:id',
    '/articles{/:id}',
    '/files/*path',
    '/admin{/*path}',
    '/a\\(b\\)',
    '/f/*"my path"',
    '/f/*$rest',
    '/f/{*"p"}',
    '/users/:"my (name)"',
  ])('does not change the path-to-regexp v8 path %s', (path) => {
    expect(translateRoutePath(path)).toMatchObject({
      path,
      changed: false,
      constraints: [],
      positionalParams: [],
    });
  });

  it('lists the parameter names of the translated path in order', () => {
    expect(
      translateRoutePath('/a/:id(\\d+)/*"x y"/:"my (name)"/*$rest/(.*)').parameterNames
    ).toEqual(['id', 'x y', 'my (name)', '$rest', 'splat']);
    expect(translateRoutePath('/files/:path(\\d+)+/:404').parameterNames).toEqual(['path', '404']);
  });

  it('namespaces the names of unnamed and literal groups when asked', () => {
    const translated = translateRoutePath('/p/(\\d+)/(.*){ab}+', { namespace: 'v6Prefix1' });

    expect(translated.path).toBe('/p/:v6Prefix1Splat1/{*v6Prefix1Splat2}:v6Prefix1Literal0');
    expect(translated.positionalParams).toEqual(['v6Prefix1Splat1', 'v6Prefix1Splat2']);
    expect(translated.hiddenParams).toEqual(['v6Prefix1Literal0']);
  });

  it('keeps a v8 quoted name whole when a constraint is also translated', () => {
    const translated = translateRoutePath('/a/:id(\\d+)/*"x (y)"');

    expect(translated.path).toBe('/a/:id/*"x (y)"');
    expect(translated.constraints.map(({ name }) => name)).toEqual(['id']);
  });

  it('keeps custom parameter patterns as constraints', () => {
    const { constraints } = translateRoutePath('/users/:id(\\d+)');

    expect(constraints).toHaveLength(1);
    expect(constraints[0]).toMatchObject({ name: 'id' });
    expect(constraints[0].pattern.test('123')).toBe(true);
    expect(constraints[0].pattern.test('abc')).toBe(false);
  });

  it('keeps an unnamed alternation as a constraint', () => {
    const { constraints, positionalParams } = translateRoutePath('/items/(collection|single)');

    expect(positionalParams).toEqual(['splat']);
    expect(constraints[0].pattern.test('collection')).toBe(true);
    expect(constraints[0].pattern.test('Collection')).toBe(true);
    expect(constraints[0].pattern.test('other')).toBe(false);
  });

  it('checks every segment of a repeated custom pattern', () => {
    const { constraints } = translateRoutePath('/files/:path(\\d+)+');

    expect(constraints[0].pattern.test('12')).toBe(true);
    expect(constraints[0].pattern.test('12/34')).toBe(true);
    expect(constraints[0].pattern.test('12/ab')).toBe(false);
  });

  it('hides the parameter used to test a repeated literal', () => {
    expect(translateRoutePath('/x{ab}+')).toMatchObject({
      hiddenParams: ['v6Literal0'],
      constraints: [expect.objectContaining({ name: 'v6Literal0' })],
    });
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
    '/items/(a|b)',
    '/files/:path(\\d+)+',
    '/files/:path(\\d+)*',
    '/users/:404',
    '/files/:id$name',
    '/:attr1?{-:attr2}?',
    '/x{ab}+',
    '{ab}?',
  ])('produces a path accepted by @koa/router for %s', (path) => {
    const router = new Router();

    expect(() => router.get(translateRoutePath(path).path, () => undefined)).not.toThrow();
  });

  it.each([
    ['/(?!uploads/).+', 'the group "(?!uploads/)" has no v8 equivalent'],
    ['{:id(\\d+).html}+', 'the repeated parameter ":id" has a suffix'],
    ['n:id(\\d+)+', 'the repeated parameter ":id" has no prefix'],
    ['/users/:id(\\d+', 'is unclosed'],
    ['/users/:id(\\d{2,1})', 'the custom pattern for ":id" is invalid'],
  ])('fails for %s instead of changing what it matches', (path, reason) => {
    expect(() => translateRoutePath(path)).toThrow(RoutePathMigrationError);
    expect(() => translateRoutePath(path)).toThrow(reason);
  });
});
