import { describe, expect, it, vi } from 'vitest';
import Router from '@koa/router';
import request from 'supertest';
import type { Core } from '@strapi/types';

import createKoaApp from '../koa';
import createEndpointComposer from '../compose-endpoint';
import { createRouteManager } from '../routing';
import { getRouteSourcePath, installRoutePathTranslation } from '../route-path';

// Handlers record what they received instead of writing it to the response.
let lastReply: unknown;
const reply = (ctx: { status: number }, data: unknown) => {
  lastReply = data;
  ctx.status = 200;
};
const expectReply = async (
  test: { expect(status: number): PromiseLike<unknown> },
  expected: unknown
) => {
  lastReply = undefined;
  await test.expect(200);
  expect(lastReply).toEqual(expected);
};

const createStrapi = () =>
  ({
    log: { warn: vi.fn() },
    get(name: string) {
      if (name === 'auth') {
        return {
          authenticate: (_ctx: unknown, next: () => Promise<void>) => next(),
          verify: vi.fn(),
        };
      }

      if (name === 'policies') {
        return { resolve: () => [] };
      }

      throw new Error(`Unexpected service ${name}`);
    },
  }) as unknown as Core.Strapi;

/** Registers each path in order; a route answers with its path and the params it received. */
const createServerFactory =
  (withTranslation: boolean) =>
  (...paths: string[]) => {
    const strapi = createStrapi();
    const router = new Router();
    if (withTranslation) {
      installRoutePathTranslation(router, strapi);
    }
    const composeEndpoint = createEndpointComposer(strapi);

    paths.forEach((path) => {
      composeEndpoint(
        {
          method: 'GET',
          path,
          handler(ctx) {
            reply(ctx, { route: path, params: { ...ctx.params } });
          },
          info: {},
        },
        { router }
      );
    });

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());

    return { strapi, server: app.callback() };
  };

describe.each([
  ['a plain router', false],
  ['a router with path translation installed', true],
])('compose endpoint on %s', (_label, withTranslation) => {
  const createServer = createServerFactory(withTranslation);

  it('warns when a route path uses path-to-regexp v6 syntax', () => {
    const { strapi } = createServer('/users/:id(\\d+)');

    expect(strapi.log.warn).toHaveBeenCalledTimes(1);
    expect(strapi.log.warn).toHaveBeenCalledWith(
      'Route "GET /users/:id(\\d+)" uses path-to-regexp v6 syntax and was migrated to "/users/:id".'
    );
  });

  it('does not warn for a path-to-regexp v8 path', () => {
    const { strapi } = createServer('/users/:id');

    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  it('matches an unnamed alternation and exposes it as ctx.params[0]', async () => {
    const { server } = createServer(
      '/content-manager/(collection|single)-types/:id',
      '/content-manager/:kind-types/:id'
    );

    await expectReply(request(server).get('/content-manager/collection-types/1'), {
      route: '/content-manager/(collection|single)-types/:id',
      params: { 0: 'collection', id: '1' },
    });
    await expectReply(request(server).get('/content-manager/single-types/2'), {
      route: '/content-manager/(collection|single)-types/:id',
      params: { 0: 'single', id: '2' },
    });
    await expectReply(request(server).get('/content-manager/other-types/1'), {
      route: '/content-manager/:kind-types/:id',
      params: { kind: 'other', id: '1' },
    });
  });

  it('enforces a custom letter pattern, and the router is not case sensitive', async () => {
    const { server } = createServer('/posts/:slug([a-z0-9-]+)', '/posts/:slug');

    await expectReply(request(server).get('/posts/Hello'), {
      route: '/posts/:slug([a-z0-9-]+)',
      params: { slug: 'Hello' },
    });
    await expectReply(request(server).get('/posts/Hello_World'), {
      route: '/posts/:slug',
      params: { slug: 'Hello_World' },
    });
  });

  it('matches an alternation in either case', async () => {
    const { server } = createServer(
      '/content-manager/(collection|single)-types/:id',
      '/content-manager/:kind-types/:id'
    );

    await expectReply(request(server).get('/content-manager/Collection-types/1'), {
      route: '/content-manager/(collection|single)-types/:id',
      params: { 0: 'Collection', id: '1' },
    });
  });

  it('lets a character range that contains a slash span segments', async () => {
    const { server } = createServer('/files/:path([!-~]+)');

    await expectReply(request(server).get('/files/a/b'), {
      route: '/files/:path([!-~]+)',
      params: { path: 'a/b' },
    });
  });

  it('enforces a custom pattern', async () => {
    const { server } = createServer('/users/:id(\\d+)');

    await expectReply(request(server).get('/users/12'), {
      route: '/users/:id(\\d+)',
      params: { id: '12' },
    });
    await request(server).get('/users/abc').expect(404);
  });

  it('falls through to the next route when a custom pattern rejects the value', async () => {
    const { server } = createServer('/users/:id(\\d+)', '/users/me');

    await expectReply(request(server).get('/users/me'), {
      route: '/users/me',
      params: {},
    });
  });

  it('matches an omitted optional parameter that has a custom pattern', async () => {
    const { server } = createServer('/users/:id(\\d+)?');

    await request(server).get('/users').expect(200);
    await request(server).get('/users/12').expect(200);
    await request(server).get('/users/abc').expect(404);
  });

  it('keeps the text before a named wildcard', async () => {
    const { server } = createServer('/files-:path(.*)');

    await expectReply(request(server).get('/files-a/b'), {
      route: '/files-:path(.*)',
      params: { path: 'a/b' },
    });
    await request(server).get('/api/users').expect(404);
  });

  it('lets a pattern that can contain a slash span segments', async () => {
    const { server } = createServer('/files/:path(.+)');

    await expectReply(request(server).get('/files/a/b'), {
      route: '/files/:path(.+)',
      params: { path: 'a/b' },
    });
  });

  it('matches an unnamed group and exposes it as ctx.params[0]', async () => {
    const { server } = createServer('/items/(\\d+)');

    await expectReply(request(server).get('/items/12'), {
      route: '/items/(\\d+)',
      params: { 0: '12' },
    });
    await request(server).get('/items/ab').expect(404);
  });

  it('exposes an unnamed (.*) as ctx.params[0]', async () => {
    const { server } = createServer('/files/(.*)');

    await expectReply(request(server).get('/files/a/b'), {
      route: '/files/(.*)',
      params: { 0: 'a/b' },
    });
  });

  it.each([
    ['/files/(.*)', '/files/'],
    ['/files-:path(.*)', '/files-'],
    ['/files/:path(.*)', '/files/'],
  ])('leaves %s out of ctx.params on an empty match, as v6 did', async (route, url) => {
    const { server } = createServer(route);

    await expectReply(request(server).get(url), { route, params: {} });
  });

  it('leaves an omitted optional parameter undefined', async () => {
    const { server } = createServer('/users/:id(\\d*)?');

    await expectReply(request(server).get('/users'), { route: '/users/:id(\\d*)?', params: {} });
  });

  it('matches one or more segments of a repeated custom pattern', async () => {
    const { server, strapi } = createServer('/files/:path(\\d+)+');

    await expectReply(request(server).get('/files/12'), {
      route: '/files/:path(\\d+)+',
      params: { path: '12' },
    });
    await expectReply(request(server).get('/files/12/34'), {
      route: '/files/:path(\\d+)+',
      params: { path: '12/34' },
    });
    await expectReply(request(server).get('/files/12/ab'), {
      route: '/files/:path(\\d+)+',
      params: { path: '12/ab' },
    });
    await request(server).get('/files').expect(404);

    const messages = strapi.log.warn.mock.calls.map(([message]) => String(message)).join('\n');
    expect(messages).toContain('pattern `\\d+` on `:path` is no longer enforced');
  });

  it('keeps a negated class that excludes "/" on one segment', async () => {
    const { server } = createServer('/files/:name([^/]+)', '/files/:a/:b');

    await expectReply(request(server).get('/files/ab'), {
      route: '/files/:name([^/]+)',
      params: { name: 'ab' },
    });
    await expectReply(request(server).get('/files/a%2Fb'), {
      route: '/files/:name([^/]+)',
      params: { name: 'a/b' },
    });
    await expectReply(request(server).get('/files/a/b'), {
      route: '/files/:a/:b',
      params: { a: 'a', b: 'b' },
    });
  });

  it('splits optional parameters that have no text between them', async () => {
    const { server } = createServer('/x/:a(\\d+)?:b([a-z]+)');

    await expectReply(request(server).get('/x/12ab'), {
      route: '/x/:a(\\d+)?:b([a-z]+)',
      params: { a: '12', b: 'ab' },
    });
    await expectReply(request(server).get('/x/12ab/'), {
      route: '/x/:a(\\d+)?:b([a-z]+)',
      params: { a: '12', b: 'ab' },
    });
    await expectReply(request(server).get('/xab'), {
      route: '/x/:a(\\d+)?:b([a-z]+)',
      params: { b: 'ab' },
    });
    await expectReply(request(server).get('/xab/'), {
      route: '/x/:a(\\d+)?:b([a-z]+)',
      params: { b: 'ab' },
    });
    await request(server).get('/x12ab').expect(404);
    await request(server).get('/x/ab').expect(404);
  });

  it('splits a required parameter joined to an optional one', async () => {
    const { server } = createServer('/x/:a([a-z]+):b(\\d+)?');

    await expectReply(request(server).get('/x/ab'), {
      route: '/x/:a([a-z]+):b(\\d+)?',
      params: { a: 'ab' },
    });
    await expectReply(request(server).get('/x/ab12'), {
      route: '/x/:a([a-z]+):b(\\d+)?',
      params: { a: 'ab', b: '12' },
    });
    await expectReply(request(server).get('/x/ab12/'), {
      route: '/x/:a([a-z]+):b(\\d+)?',
      params: { a: 'ab', b: '12' },
    });
    await expectReply(request(server).get('/x/ab/'), {
      route: '/x/:a([a-z]+):b(\\d+)?',
      params: { a: 'ab' },
    });
    await request(server).get('/x/ab12/extra').expect(404);
    await request(server).get('/x').expect(404);
  });

  it('keeps a slash that an optional joined piece includes', async () => {
    const { server } = createServer('/x/{:a([a-z]+)/}?:b(\\d+)?');

    await expectReply(request(server).get('/x/ab/'), {
      route: '/x/{:a([a-z]+)/}?:b(\\d+)?',
      params: { a: 'ab' },
    });
    await expectReply(request(server).get('/x/ab/12'), {
      route: '/x/{:a([a-z]+)/}?:b(\\d+)?',
      params: { a: 'ab', b: '12' },
    });
    await expectReply(request(server).get('/x/ab/12/'), {
      route: '/x/{:a([a-z]+)/}?:b(\\d+)?',
      params: { a: 'ab', b: '12' },
    });
    await request(server).get('/x/ab12/').expect(404);
  });

  it('does not treat a slash before later text as optional', async () => {
    const { server } = createServer('/x/:a([a-z]+):b(\\d+)?/y');

    await expectReply(request(server).get('/x/ab/y'), {
      route: '/x/:a([a-z]+):b(\\d+)?/y',
      params: { a: 'ab' },
    });
    await expectReply(request(server).get('/x/ab12/y'), {
      route: '/x/:a([a-z]+):b(\\d+)?/y',
      params: { a: 'ab', b: '12' },
    });
    await expectReply(request(server).get('/x/ab/y/'), {
      route: '/x/:a([a-z]+):b(\\d+)?/y',
      params: { a: 'ab' },
    });
    await request(server).get('/x/ab//y').expect(404);
    await request(server).get('/x/ab//y/').expect(404);
  });

  it('does not treat a repeated ending as the trailing slash', async () => {
    const { server } = createServer('/x/:a([a-z]+):b(\\d+)?/y', '/x/(.*)');

    await expectReply(request(server).get('/x/ab/y/'), {
      route: '/x/:a([a-z]+):b(\\d+)?/y',
      params: { a: 'ab' },
    });
    await expectReply(request(server).get('/x/y//y/'), {
      route: '/x/(.*)',
      params: { 0: 'y//y/' },
    });
    await expectReply(request(server).get('/x/ab//y/'), {
      route: '/x/(.*)',
      params: { 0: 'ab//y/' },
    });
  });

  it('does not match a repeated separator before a trailing slash', async () => {
    const { server } = createServer('/x/:a([a-z]+):b(\\d+)?-y');

    await expectReply(request(server).get('/x/ab-y'), {
      route: '/x/:a([a-z]+):b(\\d+)?-y',
      params: { a: 'ab' },
    });
    await expectReply(request(server).get('/x/ab-y/'), {
      route: '/x/:a([a-z]+):b(\\d+)?-y',
      params: { a: 'ab' },
    });
    await request(server).get('/x/y/-y/').expect(404);
  });

  it('matches when every joined parameter is optional', async () => {
    const { server } = createServer('/x/:a([a-z]+)?:b(\\d+)?');

    await expectReply(request(server).get('/x'), {
      route: '/x/:a([a-z]+)?:b(\\d+)?',
      params: {},
    });
    await expectReply(request(server).get('/x/ab12'), {
      route: '/x/:a([a-z]+)?:b(\\d+)?',
      params: { a: 'ab', b: '12' },
    });
    await expectReply(request(server).get('/x12'), {
      route: '/x/:a([a-z]+)?:b(\\d+)?',
      params: { b: '12' },
    });
    await request(server).get('/xab12').expect(404);
  });

  it('checks each optional parameter against its own value', async () => {
    const { server } = createServer('/o/:a(\\d+)?/:b([a-z]+)?');

    await expectReply(request(server).get('/o/1/x'), {
      route: '/o/:a(\\d+)?/:b([a-z]+)?',
      params: { a: '1', b: 'x' },
    });
    await expectReply(request(server).get('/o/1'), {
      route: '/o/:a(\\d+)?/:b([a-z]+)?',
      params: { a: '1' },
    });
    await expectReply(request(server).get('/o'), {
      route: '/o/:a(\\d+)?/:b([a-z]+)?',
      params: {},
    });
    await expectReply(request(server).get('/o/x'), {
      route: '/o/:a(\\d+)?/:b([a-z]+)?',
      params: { b: 'x' },
    });
    await request(server).get('/o/x/1').expect(404);
    await request(server).get('/o/1/2').expect(404);
  });

  it('splits a plain parameter joined to a patterned one', async () => {
    const { server } = createServer('/x/:a:b(\\d+)');

    await expectReply(request(server).get('/x/ab12'), {
      route: '/x/:a:b(\\d+)',
      params: { a: 'ab', b: '12' },
    });
    await expectReply(request(server).get('/x/abc123'), {
      route: '/x/:a:b(\\d+)',
      params: { a: 'abc', b: '123' },
    });
    await request(server).get('/x/ab').expect(404);
    await request(server).get('/x/ab/12').expect(404);
  });

  it('tests a custom pattern against the encoded path, as v6 did', async () => {
    const { server } = createServer('/users/:id(\\d+)', '/users/:slug');

    await expectReply(request(server).get('/users/12'), {
      route: '/users/:id(\\d+)',
      params: { id: '12' },
    });
    await expectReply(request(server).get('/users/%31%32'), {
      route: '/users/:slug',
      params: { slug: '12' },
    });
  });

  it('matches a repeated alternation in a named parameter', async () => {
    const { server } = createServer('/tags/:tag(red|blue)+');

    await expectReply(request(server).get('/tags/red/blue'), {
      route: '/tags/:tag(red|blue)+',
      params: { tag: 'red/blue' },
    });
    await expectReply(request(server).get('/tags/red/green'), {
      route: '/tags/:tag(red|blue)+',
      params: { tag: 'red/green' },
    });
  });

  it('matches a v8 quoted wildcard and a $-named wildcard without rewriting them', async () => {
    const { server } = createServer('/f/*"my path"', '/g/*$rest');

    await expectReply(request(server).get('/f/a/b'), {
      route: '/f/*"my path"',
      params: { 'my path': 'a/b' },
    });
    await expectReply(request(server).get('/g/x/y'), {
      route: '/g/*$rest',
      params: { $rest: 'x/y' },
    });
  });

  it('matches zero or more segments of a repeated custom pattern', async () => {
    const { server } = createServer('/files/:path(\\d+)*');

    await expectReply(request(server).get('/files'), { route: '/files/:path(\\d+)*', params: {} });
    await expectReply(request(server).get('/files/12/34'), {
      route: '/files/:path(\\d+)*',
      params: { path: '12/34' },
    });
    await expectReply(request(server).get('/files/12/ab'), {
      route: '/files/:path(\\d+)*',
      params: { path: '12/ab' },
    });
  });

  it('keeps a v6 custom prefix optional only when the group is optional', async () => {
    const { server } = createServer('/:attr1?{-:attr2}?');

    await expectReply(request(server).get('/test'), {
      route: '/:attr1?{-:attr2}?',
      params: { attr1: 'test' },
    });
    await expectReply(request(server).get('/test-test'), {
      route: '/:attr1?{-:attr2}?',
      params: { attr1: 'test', attr2: 'test' },
    });
  });

  it('does not let v8 swallow a suffix that was literal in v6', async () => {
    const { server } = createServer('/files/:id$name');

    await expectReply(request(server).get('/files/abc$name'), {
      route: '/files/:id$name',
      params: { id: 'abc' },
    });
    await request(server).get('/files/abc').expect(404);
  });

  it('keeps a parameter whose name starts with a digit', async () => {
    const { server } = createServer('/pages/:404');

    await expectReply(request(server).get('/pages/home'), {
      route: '/pages/:404',
      params: { 404: 'home' },
    });
  });

  it('matches a repeated literal without exposing the synthetic parameter', async () => {
    const { server } = createServer('/x{ab}+');

    await expectReply(request(server).get('/xab'), { route: '/x{ab}+', params: {} });
    await expectReply(request(server).get('/xAB'), { route: '/x{ab}+', params: {} });
    await expectReply(request(server).get('/xabab'), { route: '/x{ab}+', params: {} });
    await expectReply(request(server).get('/xabc'), { route: '/x{ab}+', params: {} });
  });

  it('checks a custom pattern followed by literal text', async () => {
    const { server } = createServer('/a/:id(\\d+)suffix');

    await expectReply(request(server).get('/a/12suffix'), {
      route: '/a/:id(\\d+)suffix',
      params: { id: '12' },
    });
    await request(server).get('/a/xxsuffix').expect(404);
  });

  it.each([
    ['/img/:w(\\d+)x:h(\\d+)', '/img/100x200', { w: '100', h: '200' }],
    ['/:a([a-z]+):b(\\d*)', '/abc123', { a: 'abc', b: '123' }],
    ['/:a([a-z]+):b(\\d*)', '/abc', { a: 'abc' }],
    ['/:a(\\d):b(\\d):c(\\d)', '/123', { a: '1', b: '2', c: '3' }],
  ])('keeps separate parameters for %s', async (route, url, params) => {
    const { server } = createServer(route);

    await expectReply(request(server).get(url), { route, params });
  });

  it.each([
    [
      '/:slug/:year(\\d{4}):month(\\d{2})',
      '/news/202611',
      { slug: 'news', year: '2026', month: '11' },
    ],
    ['/:a.:b(\\d):c(\\d)', '/x.12', { a: 'x', b: '1', c: '2' }],
    ['/o/:id(a\\57b)', '/o/a/b', { id: 'a/b' }],
  ])('splits joined custom patterns back into parameters for %s', async (route, url, params) => {
    const { server } = createServer(route);

    await expectReply(request(server).get(url), { route, params });
  });

  it.each(['/:a-:b(\\d+-)', '/:a.:b(\\w+\\.)'])(
    'no longer matches %s when the pattern contained the separator',
    async (route) => {
      const { server } = createServer(route);

      await request(server)
        .get(route === '/:a-:b(\\d+-)' ? '/x-1-' : '/x.y.')
        .expect(404);
    }
  );

  it.each([
    ['/static/:file(.+\\.js)', '/static/a/b.js', { file: 'a/b.js' }],
    ['/v/:ver(\\d+/beta)', '/v/1/beta', { ver: '1/beta' }],
  ])('lets %s match a value containing a slash', async (route, url, params) => {
    const { server } = createServer(route);

    await expectReply(request(server).get(url), { route, params });
  });

  it('splits values as v6 did when a pattern is lazy', async () => {
    const { server } = createServer('/:a(.+?)/:b(.+)');

    await expectReply(request(server).get('/1/2/3'), {
      route: '/:a(.+?)/:b(.+)',
      params: { a: '1/2', b: '3' },
    });
  });

  it('keeps a parameter named splat next to an unnamed group', async () => {
    const { server } = createServer('/:splat/(.*)');

    await expectReply(request(server).get('/x/y/z'), {
      route: '/:splat/(.*)',
      params: { 0: 'y/z', splat: 'x' },
    });
  });

  it('matches a repeated parameter with a suffix', async () => {
    const { server } = createServer('/f{/:id(\\d+).html}+');

    await expectReply(request(server).get('/f/1.html/2.html'), {
      route: '/f{/:id(\\d+).html}+',
      params: { id: '1.html/2' },
    });
    await expectReply(request(server).get('/f/1.html/a.html'), {
      route: '/f{/:id(\\d+).html}+',
      params: { id: '1.html/a' },
    });
  });
});

describe('router path registration', () => {
  const createRouterApp = () => {
    const strapi = createStrapi();
    const router = new Router();
    installRoutePathTranslation(router, strapi);

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());

    return { strapi, router, server: app.callback() };
  };

  it('translates a path registered with router.use', async () => {
    const { strapi, server, router } = createRouterApp();
    const seen: Array<string | undefined> = [];

    router.use('/content-type-builder/content-types/:uid?', (ctx, next) => {
      seen.push(ctx.params.uid);
      return next();
    });
    router.get('/content-type-builder/content-types{/:uid}', (ctx) => {
      reply(ctx, { uid: ctx.params.uid ?? null });
    });

    expect(strapi.log.warn).toHaveBeenCalledTimes(1);
    expect(strapi.log.warn).toHaveBeenCalledWith(
      'Route "USE /content-type-builder/content-types/:uid?" uses path-to-regexp v6 syntax and was migrated to "/content-type-builder/content-types{/:uid}".'
    );
    await expectReply(request(server).get('/content-type-builder/content-types'), { uid: null });
    await expectReply(
      request(server).get('/content-type-builder/content-types/api::article.article'),
      { uid: 'api::article.article' }
    );
    expect(seen).toEqual([undefined, 'api::article.article']);
  });

  it('translates router.get, including a named route, and enforces the custom pattern', async () => {
    const { strapi, server, router } = createRouterApp();

    router.get('user', '/users/:id(\\d+)', (ctx) => {
      reply(ctx, { ...ctx.params });
    });
    router.get('/users/me', (ctx) => {
      reply(ctx, { me: true });
    });

    expect(strapi.log.warn).toHaveBeenCalledTimes(1);
    expect(router.route('user')).toMatchObject({ path: '/users/:id' });
    await expectReply(request(server).get('/users/12'), { id: '12' });
    await expectReply(request(server).get('/users/me'), { me: true });
    await request(server).get('/users/abc').expect(404);
  });

  it('warns when a pattern that can match a slash is not enforced', () => {
    const { strapi, router } = createRouterApp();

    router.get('/static/:file(.+\\.js)', (ctx) => {
      reply(ctx, { ...ctx.params });
    });

    const messages = strapi.log.warn.mock.calls.map(([message]) => String(message)).join('\n');
    expect(messages).toContain('pattern `.+\\.js` on `:file` is no longer enforced');
  });

  it('warns when a group suffix becomes the next optional prefix', async () => {
    const { strapi, router, server } = createRouterApp();

    router.get('/a/{:x(\\d+)/}:y(\\d+)?', (ctx) => {
      reply(ctx, { ...ctx.params });
    });

    const messages = strapi.log.warn.mock.calls.map(([message]) => String(message)).join('\n');
    expect(messages).toContain('pattern `\\d+` on `:x` is no longer enforced');
    await expectReply(request(server).get('/a/abc/5'), { x: 'abc', y: '5' });
  });

  it('does not drop a trailing slash on a strict router', async () => {
    const strapi = createStrapi();
    const router = new Router({ strict: true });
    const composeEndpoint = createEndpointComposer(strapi);

    composeEndpoint(
      {
        method: 'GET',
        path: '/x/:a([a-z]+):b(\\d+)?',
        handler(ctx) {
          reply(ctx, { ...ctx.params });
        },
        info: {},
      },
      { router }
    );

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await expectReply(request(server).get('/x/ab12'), { a: 'ab', b: '12' });
    await request(server).get('/x/ab12/').expect(404);
    await request(server).get('/x/ab/').expect(404);
  });

  it('does not warn that .* is no longer enforced', () => {
    const { strapi, router } = createRouterApp();

    router.get('/files/(.*)', (ctx) => {
      reply(ctx, { ...ctx.params });
    });
    router.get('/files/:path(.*)', (ctx) => {
      reply(ctx, { ...ctx.params });
    });
    router.get('/files-:path(.*)', (ctx) => {
      reply(ctx, { ...ctx.params });
    });

    expect(strapi.log.warn).toHaveBeenCalledTimes(3);
    expect(strapi.log.warn.mock.calls.map(([message]) => message).join('\n')).not.toContain(
      'no longer enforced'
    );
  });

  it('does not warn again for a path compose-endpoint already migrated', () => {
    const strapi = createStrapi();
    const router = new Router();
    installRoutePathTranslation(router, strapi);

    createEndpointComposer(strapi)(
      {
        method: 'GET',
        path: '/users/:id(\\d+)',
        handler(ctx) {
          reply(ctx, { ok: true });
        },
        info: {},
      },
      { router }
    );

    expect(strapi.log.warn).toHaveBeenCalledTimes(1);
  });

  it('leaves a v8 brace path unchanged', () => {
    const { strapi, router } = createRouterApp();

    router.use('/content-type-builder/content-types{/:uid}', (ctx, next) => next());

    expect(strapi.log.warn).not.toHaveBeenCalled();
    expect(router.stack.at(-1)).toMatchObject({
      path: '/content-type-builder/content-types{/:uid}',
    });
  });

  it('mounts pathless middleware, including an API router', async () => {
    const { router } = createRouterApp();
    const api = new Router({ prefix: '/api' });
    api.get('/x', (ctx) => {
      reply(ctx, 'x');
    });

    expect(() => router.use((_ctx, next) => next())).not.toThrow();
    expect(() => router.use(api.routes(), api.allowedMethods())).not.toThrow();

    const { createServer: createStrapiServer } = await import('../index');
    const strapi = {
      ...createStrapi(),
      config: { get: (_key: string, fallback?: unknown) => fallback },
    } as unknown as Core.Strapi;

    expect(() => createStrapiServer(strapi).mount()).not.toThrow();
  });

  it('keeps routes on a nested router mounted under a v6 pattern', async () => {
    const { router } = createRouterApp();
    const nested = new Router();
    nested.get('/child', (ctx) => {
      reply(ctx, { ok: true });
    });
    router.use('/v/:id(\\d+)', nested.routes());

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());

    await expectReply(request(app.callback()).get('/v/1/child'), { ok: true });
  });

  it('answers 404 for another method when the custom pattern rejects the path', async () => {
    const strapi = createStrapi();
    const router = new Router();
    installRoutePathTranslation(router, strapi);
    const seen: unknown[] = [];
    router.get('/users/:id(\\d+)', (ctx) => {
      seen.push(ctx.params.id);
      reply(ctx, { ok: true });
    });

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    app.use(router.allowedMethods());
    const server = app.callback();

    await expectReply(request(server).get('/users/12'), { ok: true });
    expect(seen).toEqual(['12']);
    await request(server).get('/users/abc').expect(404);
    await request(server).post('/users/abc').expect(404);
  });

  it('enforces a custom pattern on a v6 router prefix', async () => {
    const strapi = createStrapi();
    const router = new Router({ prefix: '/pre/:v(\\d+)' });
    installRoutePathTranslation(router, strapi);
    router.get('/x', (ctx) => {
      reply(ctx, { v: ctx.params.v });
    });

    expect(strapi.log.warn).toHaveBeenCalledWith(
      'Router prefix "/pre/:v(\\d+)" uses path-to-regexp v6 syntax and was migrated to "/pre/:v".'
    );

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await expectReply(request(server).get('/pre/1/x'), { v: '1' });
    await request(server).get('/pre/abc/x').expect(404);
  });

  it('translates an optional parameter in a router prefix', async () => {
    const strapi = createStrapi();
    const router = new Router({ prefix: '/opt/:v?' });
    installRoutePathTranslation(router, strapi);
    router.get('/x', (ctx) => {
      reply(ctx, { v: ctx.params.v ?? null });
    });

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await expectReply(request(server).get('/opt/x'), { v: null });
    await expectReply(request(server).get('/opt/7/x'), { v: '7' });
  });

  it('numbers unnamed groups across a router prefix and its routes, as v6 did', async () => {
    const strapi = createStrapi();
    const router = new Router({ prefix: '/p/(\\d+)' });
    installRoutePathTranslation(router, strapi);
    router.get('/(.*)', (ctx) => {
      reply(ctx, { params: { ...ctx.params }, matchedRoute: ctx._matchedRoute });
    });

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await expectReply(request(server).get('/p/12/a/b'), {
      params: { 0: '12', 1: 'a/b' },
      matchedRoute: '/p/(\\d+)/(.*)',
    });
    await request(server).get('/p/abc/a').expect(404);
  });

  it('leaves an empty prefix group out and hides a repeated prefix literal', async () => {
    const strapi = createStrapi();
    const router = new Router({ prefix: '/h{-x}+/:v(a*)' });
    installRoutePathTranslation(router, strapi);
    router.get('/y', (ctx) => {
      reply(ctx, { ...ctx.params });
    });

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await expectReply(request(server).get('/h-x-x/aa/y'), { v: 'aa' });
    await expectReply(request(server).get('/h-x//y'), {});
    await expectReply(request(server).get('/h-y/aa/y'), { v: 'aa' });
  });

  it('translates a prefix set later with router.prefix()', async () => {
    const strapi = createStrapi();
    const router = new Router();
    installRoutePathTranslation(router, strapi);
    router.get('/x', (ctx) => {
      reply(ctx, { params: { ...ctx.params }, matchedRoute: ctx._matchedRoute });
    });
    router.prefix('/old/:a(\\d+)');
    router.prefix('/v/(\\d+)/');

    expect(strapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('Router prefix "/v/(\\d+)" uses path-to-regexp v6 syntax')
    );

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await expectReply(request(server).get('/v/3/x'), {
      params: { 0: '3' },
      matchedRoute: '/v/(\\d+)/x',
    });
    await request(server).get('/v/abc/x').expect(404);
    await request(server).get('/old/1/x').expect(404);
  });

  it('enforces a custom pattern on a v6 mount path', async () => {
    const { router } = createRouterApp();
    const nested = new Router();
    nested.get('/child', (ctx) => {
      reply(ctx, { ok: true });
    });
    router.use('/v/:id(\\d+)', nested.routes());

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await expectReply(request(server).get('/v/1/child'), { ok: true });
    await request(server).get('/v/abc/child').expect(404);
  });

  it('registers a v6 route under a prefix that uses a v8 quoted name', () => {
    const strapi = createStrapi();
    const router = new Router({ prefix: '/:"my-id"' });
    installRoutePathTranslation(router, strapi);

    expect(() => router.get('/n/:id(\\d+)', () => undefined)).not.toThrow();
  });

  it('checks a v6 route composed onto a router with a v8 parameter prefix', async () => {
    const strapi = createStrapi();
    const router = new Router({ prefix: '/api/:lang' });
    createEndpointComposer(strapi)(
      {
        method: 'GET',
        path: '/:a(.*)/:b(\\d+)',
        handler(ctx) {
          reply(ctx, { ...ctx.params });
        },
        info: {},
      },
      { router }
    );

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await expectReply(request(server).get('/api/en/x/y/1'), { lang: 'en', a: 'x/y', b: '1' });
    await request(server).get('/api/en/x/y').expect(404);
  });

  it('registers a list of paths under a v6 router prefix', async () => {
    const strapi = createStrapi();
    const router = new Router({ prefix: '/p/:pid(\\d+)' });
    installRoutePathTranslation(router, strapi);
    router.get(['/a', '/b/:id(\\d+)'], (ctx) => {
      reply(ctx, { ...ctx.params });
    });

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await expectReply(request(server).get('/p/1/a'), { pid: '1' });
    await expectReply(request(server).get('/p/1/b/2'), { pid: '1', id: '2' });
    await request(server).get('/p/1/b/x').expect(404);
    await request(server).get('/p/x/a').expect(404);
  });

  it('applies a custom pattern with the router case sensitivity', async () => {
    const strapi = createStrapi();
    const router = new Router({ sensitive: true });
    installRoutePathTranslation(router, strapi);
    router.get('/s/:id([a-z]+)', (ctx) => {
      reply(ctx, { ...ctx.params });
    });

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await expectReply(request(server).get('/s/abc'), { id: 'abc' });
    await request(server).get('/s/ABC').expect(404);
  });

  it('checks a mount path parameter and a route parameter that share a name', async () => {
    const { router } = createRouterApp();
    const nested = new Router();
    installRoutePathTranslation(nested, createStrapi());
    nested.get('/:id(\\d+)', (ctx) => {
      reply(ctx, { ...ctx.params });
    });
    router.use('/m/:id(\\d+)', nested.routes());

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await expectReply(request(server).get('/m/1/2'), { id: '2' });
    await request(server).get('/m/1/x').expect(404);
    await request(server).get('/m/x/1').expect(404);
  });

  it('checks a prefix pattern and a route pattern that share a name against their own values', async () => {
    const strapi = createStrapi();
    const router = new Router({ prefix: '/s/:id(\\d+)' });
    installRoutePathTranslation(router, strapi);
    router.get('/t/:id([a-z]+)', (ctx) => {
      reply(ctx, { ...ctx.params });
    });

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await expectReply(request(server).get('/s/1/t/a'), { id: 'a' });
    await request(server).get('/s/x/t/a').expect(404);
    await request(server).get('/s/1/t/2').expect(404);
  });

  it('checks two parameters that share a name on one path against their own values', async () => {
    const strapi = createStrapi();
    const router = new Router();
    installRoutePathTranslation(router, strapi);
    router.get('/d/:id(\\d+)/:id([a-z]+)', (ctx) => {
      reply(ctx, { ...ctx.params });
    });

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await expectReply(request(server).get('/d/1/a'), { id: 'a' });
    await request(server).get('/d/a/1').expect(404);
  });

  it('checks a required and an optional parameter that share a name', async () => {
    const strapi = createStrapi();
    const router = new Router();
    installRoutePathTranslation(router, strapi);
    router.get('/m/:id(\\d+)/s/:id([a-z]+)?', (ctx) => {
      reply(ctx, { ...ctx.params });
    });

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await expectReply(request(server).get('/m/1/s/a'), { id: 'a' });
    await expectReply(request(server).get('/m/1/s'), { id: '1' });
    await request(server).get('/m/x/s').expect(404);
    await request(server).get('/m/1/s/2').expect(404);
  });

  it('reads the second optional parameter when the first one is omitted', async () => {
    const strapi = createStrapi();
    const router = new Router();
    installRoutePathTranslation(router, strapi);
    router.get('/a/:id(\\d+)?/b/:id?', (ctx) => {
      reply(ctx, { ...ctx.params });
    });

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await expectReply(request(server).get('/a/b/x'), { id: 'x' });
    await expectReply(request(server).get('/a/5/b/x'), { id: 'x' });
    await expectReply(request(server).get('/a/5/b'), { id: '5' });
    await expectReply(request(server).get('/a/b'), {});
    await request(server).get('/a/x/b/y').expect(404);
  });

  it('checks two optional parameters that share a name against their own patterns', async () => {
    const strapi = createStrapi();
    const router = new Router();
    installRoutePathTranslation(router, strapi);
    router.get('/x/:id(\\d+)?/y/:id([a-z]+)?', (ctx) => {
      reply(ctx, { ...ctx.params });
    });

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await expectReply(request(server).get('/x/y/abc'), { id: 'abc' });
    await expectReply(request(server).get('/x/5/y/abc'), { id: 'abc' });
    await expectReply(request(server).get('/x/5/y'), { id: '5' });
    await expectReply(request(server).get('/x/y'), {});
    await request(server).get('/x/y/5').expect(404);
  });

  it('checks a route pattern separately from an untranslated mount path that shares its name', async () => {
    const child = new Router();
    installRoutePathTranslation(child, createStrapi());
    child.get('/a/:id(\\d+)', (ctx) => {
      reply(ctx, { ...ctx.params });
    });

    const parent = new Router();
    parent.use('/t/:id', child.routes());

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(parent.routes());
    const server = app.callback();

    await expectReply(request(server).get('/t/abc/a/5'), { id: '5' });
    await expectReply(request(server).get('/t/1/a/5'), { id: '5' });
    await request(server).get('/t/1/a/x').expect(404);
  });

  it('splits a joined route mounted on a router that does not translate paths', async () => {
    const strapi = createStrapi();
    const child = new Router();
    installRoutePathTranslation(child, strapi);
    createEndpointComposer(strapi)(
      {
        method: 'GET',
        path: '/x/:a([a-z]+):b(\\d+)?',
        handler(ctx) {
          reply(ctx, { ...ctx.params });
        },
        info: {},
      },
      { router: child }
    );

    const parent = new Router();
    parent.use('/p', child.routes());

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(parent.routes());
    const server = app.callback();

    await expectReply(request(server).get('/p/x/ab12'), { a: 'ab', b: '12' });
    await expectReply(request(server).get('/p/x/ab12/'), { a: 'ab', b: '12' });
    await expectReply(request(server).get('/p/x/ab/'), { a: 'ab' });
  });

  it('matches a required parameter when a later optional segment is omitted', async () => {
    const strapi = createStrapi();
    const router = new Router();
    installRoutePathTranslation(router, strapi);
    router.get('/articles/:id(\\d+)/:slug?', (ctx) => {
      reply(ctx, { ...ctx.params });
    });

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await expectReply(request(server).get('/articles/5'), { id: '5' });
    await expectReply(request(server).get('/articles/5/my-post'), { id: '5', slug: 'my-post' });
    await request(server).get('/articles/x').expect(404);
  });

  it('matches a pattern after an omitted optional segment', async () => {
    const strapi = createStrapi();
    const router = new Router();
    installRoutePathTranslation(router, strapi);
    router.get('/:lang?/posts/:id(\\d+)', (ctx) => {
      reply(ctx, { ...ctx.params });
    });

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await expectReply(request(server).get('/posts/5'), { id: '5' });
    await expectReply(request(server).get('/en/posts/5'), { lang: 'en', id: '5' });
    await request(server).get('/posts/x').expect(404);
  });

  it('falls through an optional pattern to a later static route', async () => {
    const strapi = createStrapi();
    const router = new Router();
    installRoutePathTranslation(router, strapi);
    router.get('/posts/:id(\\d+)?/:page(\\d+)?', (ctx) => {
      reply(ctx, { route: 'pattern', ...ctx.params });
    });
    router.get('/posts/drafts', (ctx) => {
      reply(ctx, { route: 'drafts' });
    });

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await expectReply(request(server).get('/posts/drafts'), { route: 'drafts' });
    await expectReply(request(server).get('/posts/5'), { route: 'pattern', id: '5' });
    await expectReply(request(server).get('/posts/5/2'), { route: 'pattern', id: '5', page: '2' });
    await expectReply(request(server).get('/posts'), { route: 'pattern' });
  });

  it('gives pathless middleware the parameters of a v6 router prefix', async () => {
    const strapi = createStrapi();
    const router = new Router({ prefix: '/p/(\\d+)' });
    installRoutePathTranslation(router, strapi);
    const seen: unknown[] = [];
    router.use((ctx, next) => {
      seen.push({ ...ctx.params });
      return next();
    });
    router.get('/a', (ctx) => {
      reply(ctx, { ...ctx.params });
    });

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await expectReply(request(server).get('/p/7/a'), { 0: '7' });
    expect(seen).toEqual([{ 0: '7' }]);
  });

  it('matches a custom pattern value on an API router mounted on the server', async () => {
    const strapi = createStrapi();
    const router = new Router();
    installRoutePathTranslation(router, strapi);
    const api = new Router({ prefix: '/api' });
    installRoutePathTranslation(api, strapi);
    const seen: unknown[] = [];
    api.get('/users/:id(\\d+)', (ctx) => {
      seen.push(ctx.params.id);
      reply(ctx, { ok: true });
    });
    api.get('/files/:name([^/]+)', (ctx) => {
      reply(ctx, { name: ctx.params.name });
    });
    router.use(api.routes(), api.allowedMethods());

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    app.use(router.allowedMethods());
    const server = app.callback();

    await expectReply(request(server).get('/api/users/12'), { ok: true });
    expect(seen).toEqual(['12']);
    await request(server).get('/api/users/abc').expect(404);
    await request(server).post('/api/users/abc').expect(404);
    await expectReply(request(server).get('/api/files/a%2Fb'), { name: 'a/b' });
  });
});

describe('mount paths and matched routes', () => {
  const createApp = (router: Router) => {
    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    app.use(router.allowedMethods());
    return app.callback();
  };

  it('numbers unnamed groups across a mount path and the nested routes, as v6 did', async () => {
    const strapi = createStrapi();
    const router = new Router();
    installRoutePathTranslation(router, strapi);
    const nested = new Router();
    installRoutePathTranslation(nested, strapi);
    nested.get('/child/(.*)', (ctx) => {
      reply(ctx, { params: { ...ctx.params }, matchedRoute: ctx._matchedRoute });
    });
    router.use('/v/(\\d+)', nested.routes());

    const server = createApp(router);

    await expectReply(request(server).get('/v/1/child/a/b'), {
      params: { 0: '1', 1: 'a/b' },
      matchedRoute: '/v/(\\d+)/child/(.*)',
    });
    await request(server).get('/v/x/child/a').expect(404);
  });

  it('exposes an unnamed group on a middleware mount path as ctx.params[0]', async () => {
    const strapi = createStrapi();
    const router = new Router();
    installRoutePathTranslation(router, strapi);
    const seen: unknown[] = [];
    router.use('/files/(.*)', (ctx, next) => {
      seen.push(ctx.params[0]);
      return next();
    });
    router.get('/files/:name', (ctx) => {
      reply(ctx, { ok: true });
    });

    await expectReply(request(createApp(router)).get('/files/a.txt'), { ok: true });
    expect(seen).toEqual(['a.txt']);
  });

  it('sets ctx._matchedRoute to the path as written, under a prefix', async () => {
    const strapi = createStrapi();
    const router = new Router();
    installRoutePathTranslation(router, strapi);
    const api = new Router({ prefix: '/api' });
    installRoutePathTranslation(api, strapi);
    createRouteManager(strapi).addRoutes(
      [
        {
          method: 'GET',
          path: '/users/:id(\\d+)',
          handler(ctx) {
            reply(ctx, { matchedRoute: ctx._matchedRoute });
          },
        },
        {
          method: 'GET',
          path: '/',
          handler(ctx) {
            reply(ctx, { matchedRoute: ctx._matchedRoute });
          },
        },
      ],
      api
    );
    router.use(api.routes(), api.allowedMethods());

    const server = createApp(router);

    await expectReply(request(server).get('/api/users/1'), {
      matchedRoute: '/api/users/:id(\\d+)',
    });
    await expectReply(request(server).get('/api'), { matchedRoute: '/api' });
  });

  it('reports the path as written for each layer', () => {
    const strapi = createStrapi();
    const router = new Router({ prefix: '/api' });
    installRoutePathTranslation(router, strapi);
    createRouteManager(strapi).addRoutes(
      [
        { method: 'GET', path: '/uploads/(.*)', handler() {} },
        { method: 'GET', path: '/users/:id', handler() {} },
      ],
      router
    );

    expect(router.stack.map((layer) => [layer.path, getRouteSourcePath(layer)])).toEqual([
      ['/api/uploads/{*v6Group1}', '/api/uploads/(.*)'],
      ['/api/users/:id', '/api/users/:id'],
    ]);
  });

  it('does not warn for a route marked to keep its v6 path', () => {
    const strapi = createStrapi();
    const router = new Router();
    installRoutePathTranslation(router, strapi);
    createRouteManager(strapi).addRoutes(
      [
        {
          method: 'GET',
          path: '/uploads/(.*)',
          handler() {},
          [Symbol.for('strapi.route.keepV6Path')]: true,
        },
      ],
      router
    );

    expect(strapi.log.warn).not.toHaveBeenCalled();
  });
});

describe("Strapi's own v6 route paths", () => {
  /** Wires routers the way the server does: a main router, an API router with a prefix, and plugin sub-routers. */
  const createStrapiServer = (
    routers: Array<{ api?: boolean; prefix?: string; paths: string[] }>
  ) => {
    const strapi = createStrapi();
    const main = new Router();
    installRoutePathTranslation(main, strapi);
    const contentApi = new Router({ prefix: '/api' });
    installRoutePathTranslation(contentApi, strapi);

    routers.forEach(({ api, prefix, paths }) => {
      const routes = paths.map((path) => ({
        method: 'GET' as const,
        path,
        info: {},
        handler(ctx: Parameters<Core.MiddlewareHandler>[0]) {
          reply(ctx, { params: { ...ctx.params }, matchedRoute: ctx._matchedRoute });
        },
        [Symbol.for('strapi.route.keepV6Path')]: true,
      }));

      createRouteManager(strapi).addRoutes(
        prefix === undefined ? routes : { type: 'admin', prefix, routes },
        api ? contentApi : main
      );
    });

    main.use(contentApi.routes(), contentApi.allowedMethods());

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(main.routes());
    app.use(main.allowedMethods());

    return { strapi, server: app.callback() };
  };

  it('serves uploads with the file path in ctx.params[0]', async () => {
    const { server, strapi } = createStrapiServer([{ paths: ['/uploads/(.*)'] }]);

    await expectReply(request(server).get('/uploads/a/b.png'), {
      params: { 0: 'a/b.png' },
      matchedRoute: '/uploads/(.*)',
    });
    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  it('serves documentation assets with the file path in ctx.params[0]', async () => {
    const { server } = createStrapiServer([{ paths: ['/plugins/documentation/(.*)'] }]);

    await expectReply(request(server).get('/plugins/documentation/swagger/ui.css'), {
      params: { 0: 'swagger/ui.css' },
      matchedRoute: '/plugins/documentation/(.*)',
    });
  });

  it('serves the provider connect route under the content API prefix', async () => {
    const { server } = createStrapiServer([{ api: true, prefix: '', paths: ['/connect/(.*)'] }]);

    await expectReply(request(server).get('/api/connect/google/callback'), {
      params: { 0: 'google/callback' },
      matchedRoute: '/api/connect/(.*)',
    });
  });

  it('serves the admin panel with the rest of the path in ctx.params.path', async () => {
    const { server } = createStrapiServer([{ paths: ['/admin/:path*'] }]);

    await expectReply(request(server).get('/admin/content-manager/collection-types'), {
      params: { path: 'content-manager/collection-types' },
      matchedRoute: '/admin/:path*',
    });
    await expectReply(request(server).get('/admin'), { params: {}, matchedRoute: '/admin/:path*' });
  });

  it('keeps the three parts of a documentation version and checks that they are numbers', async () => {
    const { server } = createStrapiServer([
      { prefix: '/documentation', paths: ['/v:major(\\d+).:minor(\\d+).:patch(\\d+)'] },
    ]);

    await expectReply(request(server).get('/documentation/v1.2.3'), {
      params: { major: '1', minor: '2', patch: '3' },
      matchedRoute: '/documentation/v:major(\\d+).:minor(\\d+).:patch(\\d+)',
    });
    await request(server).get('/documentation/v1.2.3foo').expect(404);
  });

  it('enforces an unnamed alternation', async () => {
    const { server } = createStrapiServer([
      {
        prefix: '/admin',
        paths: ['/content-manager/(collection|single)-types/:model_uid/:id/stage'],
      },
    ]);

    await expectReply(
      request(server).get('/admin/content-manager/collection-types/api::a.a/1/stage'),
      {
        params: { 0: 'collection', model_uid: 'api::a.a', id: '1' },
        matchedRoute: '/admin/content-manager/(collection|single)-types/:model_uid/:id/stage',
      }
    );
    await expectReply(request(server).get('/admin/content-manager/single-types/api::a.a/1/stage'), {
      params: { 0: 'single', model_uid: 'api::a.a', id: '1' },
      matchedRoute: '/admin/content-manager/(collection|single)-types/:model_uid/:id/stage',
    });
    await request(server).get('/admin/content-manager/other-types/api::a.a/1/stage').expect(404);
  });
});
