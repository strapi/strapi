import { describe, expect, it, vi } from 'vitest';
import Router from '@koa/router';
import request from 'supertest';
import type { Core } from '@strapi/types';

import createKoaApp from '../koa';
import createEndpointComposer from '../compose-endpoint';
import { RoutePathMigrationError, installRoutePathTranslation } from '../route-path';

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
const createServer = (...paths: string[]) => {
  const strapi = createStrapi();
  const router = new Router();
  const composeEndpoint = createEndpointComposer(strapi);

  paths.forEach((path) => {
    composeEndpoint(
      {
        method: 'GET',
        path,
        handler(ctx) {
          ctx.body = { route: path, params: { ...ctx.params } };
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

describe('compose endpoint', () => {
  it('warns when a route path uses path-to-regexp v6 syntax', () => {
    const { strapi } = createServer('/users/:id(\\d+)');

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

    await request(server)
      .get('/content-manager/collection-types/1')
      .expect(200, {
        route: '/content-manager/(collection|single)-types/:id',
        params: { splat: 'collection', 0: 'collection', id: '1' },
      });
    await request(server)
      .get('/content-manager/single-types/2')
      .expect(200, {
        route: '/content-manager/(collection|single)-types/:id',
        params: { splat: 'single', 0: 'single', id: '2' },
      });
    await request(server)
      .get('/content-manager/other-types/1')
      .expect(200, {
        route: '/content-manager/:kind-types/:id',
        params: { kind: 'other', id: '1' },
      });
  });

  it('matches a custom letter pattern in either case', async () => {
    const { server } = createServer('/posts/:slug([a-z0-9-]+)', '/posts/:slug');

    await request(server)
      .get('/posts/Hello')
      .expect(200, { route: '/posts/:slug([a-z0-9-]+)', params: { slug: 'Hello' } });
    await request(server)
      .get('/posts/Hello_World')
      .expect(200, { route: '/posts/:slug', params: { slug: 'Hello_World' } });
  });

  it('matches an alternation in either case', async () => {
    const { server } = createServer(
      '/content-manager/(collection|single)-types/:id',
      '/content-manager/:kind-types/:id'
    );

    await request(server)
      .get('/content-manager/Collection-types/1')
      .expect(200, {
        route: '/content-manager/(collection|single)-types/:id',
        params: { splat: 'Collection', 0: 'Collection', id: '1' },
      });
  });

  it('lets a character range that contains a slash span segments', async () => {
    const { server } = createServer('/files/:path([!-~]+)');

    await request(server)
      .get('/files/a/b')
      .expect(200, { route: '/files/:path([!-~]+)', params: { path: 'a/b' } });
  });

  it('does not match a value its custom pattern rejects', async () => {
    const { server } = createServer('/users/:id(\\d+)');

    await request(server)
      .get('/users/12')
      .expect(200, { route: '/users/:id(\\d+)', params: { id: '12' } });
    await request(server).get('/users/abc').expect(404);
  });

  it('lets the next route answer when a custom pattern rejects the value', async () => {
    const { server } = createServer('/users/:id(\\d+)', '/users/me');

    await request(server).get('/users/me').expect(200, { route: '/users/me', params: {} });
  });

  it('matches an omitted optional parameter that has a custom pattern', async () => {
    const { server } = createServer('/users/:id(\\d+)?');

    await request(server).get('/users').expect(200);
    await request(server).get('/users/12').expect(200);
    await request(server).get('/users/abc').expect(404);
  });

  it('keeps the text before a named wildcard', async () => {
    const { server } = createServer('/files-:path(.*)');

    await request(server)
      .get('/files-a/b')
      .expect(200, { route: '/files-:path(.*)', params: { path: 'a/b' } });
    await request(server).get('/api/users').expect(404);
  });

  it('lets a pattern that can contain a slash span segments', async () => {
    const { server } = createServer('/files/:path(.+)');

    await request(server)
      .get('/files/a/b')
      .expect(200, { route: '/files/:path(.+)', params: { path: 'a/b' } });
  });

  it('matches an unnamed group and exposes it as ctx.params[0]', async () => {
    const { server } = createServer('/items/(\\d+)');

    await request(server)
      .get('/items/12')
      .expect(200, { route: '/items/(\\d+)', params: { splat: '12', 0: '12' } });
    await request(server).get('/items/ab').expect(404);
  });

  it('exposes an unnamed (.*) as both ctx.params.splat and ctx.params[0]', async () => {
    const { server } = createServer('/files/(.*)');

    await request(server)
      .get('/files/a/b')
      .expect(200, { route: '/files/(.*)', params: { splat: 'a/b', 0: 'a/b' } });
  });

  it.each([
    ['/files/(.*)', '/files/', { splat: '', 0: '' }],
    ['/files-:path(.*)', '/files-', { path: '' }],
    ['/files/:path(.*)', '/files/', { path: '' }],
  ])('sets %s to an empty string on an empty match', async (route, url, params) => {
    const { server } = createServer(route);

    await request(server).get(url).expect(200, { route, params });
  });

  it('leaves an omitted optional parameter undefined', async () => {
    const { server } = createServer('/users/:id(\\d*)?');

    await request(server).get('/users').expect(200, { route: '/users/:id(\\d*)?', params: {} });
  });

  it('matches one or more segments of a repeated custom pattern', async () => {
    const { server } = createServer('/files/:path(\\d+)+');

    await request(server)
      .get('/files/12')
      .expect(200, { route: '/files/:path(\\d+)+', params: { path: '12' } });
    await request(server)
      .get('/files/12/34')
      .expect(200, { route: '/files/:path(\\d+)+', params: { path: '12/34' } });
    await request(server).get('/files/12/ab').expect(404);
    await request(server).get('/files').expect(404);
  });

  it('tests a custom pattern against the raw, still-encoded segment, as v6 did', async () => {
    const { server } = createServer('/files/:name([^/]+)');

    await request(server)
      .get('/files/a%2Fb')
      .expect(200, { route: '/files/:name([^/]+)', params: { name: 'a/b' } });
    await request(server).get('/files/a/b').expect(404);
  });

  it('matches a repeated alternation in a named parameter', async () => {
    const { server } = createServer('/tags/:tag(red|blue)+');

    await request(server)
      .get('/tags/red/blue')
      .expect(200, { route: '/tags/:tag(red|blue)+', params: { tag: 'red/blue' } });
    await request(server).get('/tags/red/green').expect(404);
  });

  it('matches a v8 quoted wildcard and a $-named wildcard without rewriting them', async () => {
    const { server } = createServer('/f/*"my path"', '/g/*$rest');

    await request(server)
      .get('/f/a/b')
      .expect(200, { route: '/f/*"my path"', params: { 'my path': 'a/b' } });
    await request(server)
      .get('/g/x/y')
      .expect(200, { route: '/g/*$rest', params: { $rest: 'x/y' } });
  });

  it('matches zero or more segments of a repeated custom pattern', async () => {
    const { server } = createServer('/files/:path(\\d+)*');

    await request(server).get('/files').expect(200, { route: '/files/:path(\\d+)*', params: {} });
    await request(server)
      .get('/files/12/34')
      .expect(200, { route: '/files/:path(\\d+)*', params: { path: '12/34' } });
    await request(server).get('/files/12/ab').expect(404);
  });

  it('keeps a v6 custom prefix optional only when the group is optional', async () => {
    const { server } = createServer('/:attr1?{-:attr2}?');

    await request(server)
      .get('/test')
      .expect(200, {
        route: '/:attr1?{-:attr2}?',
        params: { attr1: 'test' },
      });
    await request(server)
      .get('/test-test')
      .expect(200, {
        route: '/:attr1?{-:attr2}?',
        params: { attr1: 'test', attr2: 'test' },
      });
  });

  it('does not let v8 swallow a suffix that was literal in v6', async () => {
    const { server } = createServer('/files/:id$name');

    await request(server)
      .get('/files/abc$name')
      .expect(200, { route: '/files/:id$name', params: { id: 'abc' } });
    await request(server).get('/files/abc').expect(404);
  });

  it('keeps a parameter whose name starts with a digit', async () => {
    const { server } = createServer('/pages/:404');

    await request(server)
      .get('/pages/home')
      .expect(200, { route: '/pages/:404', params: { 404: 'home' } });
  });

  it('matches a repeated literal without exposing the synthetic parameter', async () => {
    const { server } = createServer('/x{ab}+');

    await request(server).get('/xab').expect(200, { route: '/x{ab}+', params: {} });
    await request(server).get('/xAB').expect(200, { route: '/x{ab}+', params: {} });
    await request(server).get('/xabab').expect(200, { route: '/x{ab}+', params: {} });
    await request(server).get('/xabc').expect(404);
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
      ctx.body = { uid: ctx.params.uid ?? null };
    });

    expect(strapi.log.warn).toHaveBeenCalledTimes(1);
    expect(strapi.log.warn).toHaveBeenCalledWith(
      'Route "USE /content-type-builder/content-types/:uid?" uses path-to-regexp v6 syntax and was migrated to "/content-type-builder/content-types{/:uid}".'
    );
    await request(server).get('/content-type-builder/content-types').expect(200, { uid: null });
    await request(server)
      .get('/content-type-builder/content-types/api::article.article')
      .expect(200, { uid: 'api::article.article' });
    expect(seen).toEqual([undefined, 'api::article.article']);
  });

  it('translates router.get, including a named route, and rejects a failed custom pattern', async () => {
    const { strapi, server, router } = createRouterApp();

    router.get('user', '/users/:id(\\d+)', (ctx) => {
      ctx.body = { ...ctx.params };
    });
    router.get('/users/me', (ctx) => {
      ctx.body = { me: true };
    });

    expect(strapi.log.warn).toHaveBeenCalledTimes(1);
    expect(router.route('user')).toMatchObject({ path: '/users/:id' });
    await request(server).get('/users/12').expect(200, { id: '12' });
    await request(server).get('/users/me').expect(200, { me: true });
    await request(server).get('/users/abc').expect(404);
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
          ctx.body = ctx.params;
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
      ctx.body = 'x';
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
      ctx.body = { ok: true };
    });
    router.use('/v/:id(\\d+)', nested.routes());

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());

    await request(app.callback()).get('/v/1/child').expect(200, { ok: true });
  });

  it('answers 404 when another method fails the custom pattern', async () => {
    const strapi = createStrapi();
    const router = new Router();
    installRoutePathTranslation(router, strapi);
    router.get('/users/:id(\\d+)', (ctx) => {
      ctx.body = ctx.params;
    });

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    app.use(router.allowedMethods());
    const server = app.callback();

    await request(server).get('/users/12').expect(200, { id: '12' });
    await request(server).get('/users/abc').expect(404);
    await request(server).post('/users/abc').expect(404);
  });

  it('translates a v6 router prefix and checks its custom pattern on every route', async () => {
    const strapi = createStrapi();
    const router = new Router({ prefix: '/pre/:v(\\d+)' });
    installRoutePathTranslation(router, strapi);
    router.get('/x', (ctx) => {
      ctx.body = { v: ctx.params.v };
    });

    expect(strapi.log.warn).toHaveBeenCalledWith(
      'Router prefix "/pre/:v(\\d+)" uses path-to-regexp v6 syntax and was migrated to "/pre/:v".'
    );

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await request(server).get('/pre/1/x').expect(200, { v: '1' });
    await request(server).get('/pre/abc/x').expect(404);
  });

  it('translates an optional parameter in a router prefix', async () => {
    const strapi = createStrapi();
    const router = new Router({ prefix: '/opt/:v?' });
    installRoutePathTranslation(router, strapi);
    router.get('/x', (ctx) => {
      ctx.body = { v: ctx.params.v ?? null };
    });

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await request(server).get('/opt/x').expect(200, { v: null });
    await request(server).get('/opt/7/x').expect(200, { v: '7' });
  });

  it('fails at boot for a router prefix v8 cannot express', () => {
    const router = new Router({ prefix: '/a/(.*)' });

    expect(() => installRoutePathTranslation(router, createStrapi())).toThrow(
      RoutePathMigrationError
    );
  });

  it('keeps a custom pattern on a mount path for the routes under it', async () => {
    const { router } = createRouterApp();
    const nested = new Router();
    nested.get('/child', (ctx) => {
      ctx.body = { ok: true };
    });
    router.use('/v/:id(\\d+)', nested.routes());

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    const server = app.callback();

    await request(server).get('/v/1/child').expect(200, { ok: true });
    await request(server).get('/v/abc/child').expect(404);
  });

  it('answers 404 for a failed custom pattern on an API router mounted on the server', async () => {
    const strapi = createStrapi();
    const router = new Router();
    installRoutePathTranslation(router, strapi);
    const api = new Router({ prefix: '/api' });
    installRoutePathTranslation(api, strapi);
    api.get('/users/:id(\\d+)', (ctx) => {
      ctx.body = ctx.params;
    });
    api.get('/files/:name([^/]+)', (ctx) => {
      ctx.body = { name: ctx.params.name };
    });
    router.use(api.routes(), api.allowedMethods());

    const app = createKoaApp({ proxy: false, proxyIpHeader: '', maxIpsCount: 0, keys: [] });
    app.use(router.routes());
    app.use(router.allowedMethods());
    const server = app.callback();

    await request(server).get('/api/users/12').expect(200, { id: '12' });
    await request(server).get('/api/users/abc').expect(404);
    await request(server).post('/api/users/abc').expect(404);
    await request(server).get('/api/files/a%2Fb').expect(200, { name: 'a/b' });
  });
});
