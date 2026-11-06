import { describe, expect, it } from 'vitest';
import Router from '@koa/router';
import { RoutePathMigrationError, translateRoutePath } from '../route-path';

describe('translateRoutePath', () => {
  it.each([
    ['/files/(.*)', '/files/{*v6Group1}'],
    ['/files/:path(.*)', '/files/{*path}'],
    ['/files-:path(.*)', '/files-{*path}'],
    ['/files/:path(.*)?', '/files{/*path}'],
    ['/files/:path(.+)', '/files/*path'],
    ['/files/:path([!-~]+)', '/files/*path'],
    ['/users/:id(\\d+)', '/users/:id'],
    ['/users/:id(\\d+)?', '/users{/:id}'],
    ['/posts/:slug([a-z-]+)', '/posts/:slug'],
    ['/items/(\\d+)', '/items/:v6Group1'],
    ['/users/:id?', '/users{/:id}'],
    ['/a-:id?', '/a-{:id}'],
    ['/files/:path*', '/files{/*path}'],
    ['/files/:path+', '/files/*path'],
    ['/literal[bar]!', '/literal\\[bar\\]\\!'],
    ['/items/(a|b)', '/items/:v6Group1'],
    ['/content-manager/(collection|single)-types/:id', '/content-manager/:v6Group1-types/:id'],
    ['/files/:path(\\d+)+', '/files/*path'],
    ['/files/:path(\\d+)*', '/files{/*path}'],
    ['{:id(\\d+).html}+', '*id.html'],
    ['/users/:404', '/users/:"404"'],
    ['/files/:id$name', '/files/:"id"$name'],
    ['/users/:café', '/users/:"caf"é'],
    ['/a/:id(\\d+)suffix', '/a/:"id"suffix'],
    ['/img/:w(\\d+)x:h(\\d+)', '/img/:"w"x:h'],
    ['/:a([a-z]+):b(\\d*)', '{*v6Joined1}'],
    ['/:v6Group1/(.*)', '/:v6Group1/{*v6Group2}'],
    ['/:attr1?{-:attr2}?{-:attr3}?', '{/:attr1}{-:attr2}{-:attr3}'],
    ['/users{/:id(\\d+)}?', '/users{/:id}'],
    ['{:id(\\d+)}', ':id'],
    ['{ab}?', '{ab}'],
    ['/x{ab}+', '/x:v6Literal1'],
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
    expect(translateRoutePath(path)).toEqual({ path, changed: false, generatedParams: [] });
  });

  it.each([
    ['.+\\.js', '*'],
    ['\\d+/beta', '*'],
    ['[!-~]+', '*'],
    ['\\D+', '*'],
    ['\\W+', '*'],
    ['[^a]+', '*'],
    ['a|.', '*'],
    ['\\d+', ':'],
    ['\\w+', ':'],
    ['[a-z-]+', ':'],
    ['a|b', ':'],
    ['[0-9]{2}', ':'],
    ['(?:a|b)+', ':'],
  ])('matches %s across segments only when it may match "/"', (pattern, token) => {
    expect(translateRoutePath(`/a/:x(${pattern})`).path).toBe(`/a/${token}x`);
  });

  it('lists the names it creates, which the v6 path does not have', () => {
    expect(translateRoutePath('/f/(\\d+)/(.*)').generatedParams).toEqual(['v6Group1', 'v6Group2']);
    expect(translateRoutePath('/f/:id(\\d+)').generatedParams).toEqual([]);
  });

  it('namespaces the names it creates when asked, with a ":" so a prefix has parameters', () => {
    expect(translateRoutePath('/p/(\\d+)/x{ab}+', { namespace: 'v6Prefix1' }).path).toBe(
      '/p/:"v6Prefix1:Group1"/x:"v6Prefix1:Literal1"'
    );
    expect(translateRoutePath('/p/(.*)', { namespace: 'v6Prefix1' }).path).toBe(
      '/p/{*"v6Prefix1:Group1"}'
    );
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
    '{:id(\\d+).html}+',
    '/users/:404',
    '/files/:id$name',
    '/a/:id(\\d+)suffix',
    '/img/:w(\\d+)x:h(\\d+)',
    '/:a([a-z]+):b(\\d*)',
    '/:a(\\d):b(\\d):c(\\d)',
    '/:attr1?{-:attr2}?',
    '/x{ab}+',
    '{ab}?',
  ])('produces a path accepted by @koa/router for %s', (path) => {
    const router = new Router();

    expect(() => router.get(translateRoutePath(path).path, () => undefined)).not.toThrow();
  });

  it.each([
    ['/(?!uploads/).+', 'the group "(?!uploads/)" has no v8 equivalent'],
    ['n:id(\\d+)+', 'Can not repeat "id" without a prefix and suffix'],
    ['/a/:id(\\d+)/*"x (y)"', 'it is not a valid path-to-regexp v6 path'],
    ['/users/:id(\\d+', 'is unclosed'],
    ['/users/:id(\\d{2,1})', 'the custom pattern for ":id" is invalid'],
  ])('fails for %s, which v6 rejected too', (path, reason) => {
    expect(() => translateRoutePath(path)).toThrow(RoutePathMigrationError);
    expect(() => translateRoutePath(path)).toThrow(reason);
  });
});
