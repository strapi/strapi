import { describe, expect, it, vi } from 'vitest';
import Router from '@koa/router';
import request from 'supertest';
import type { Core } from '@strapi/types';

import createKoaApp from '../koa';
import createEndpointComposer from '../compose-endpoint';
import { RoutePathMigrationError } from '../route-path';

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

  it('fails at registration when a path cannot keep its match', () => {
    expect(() => createServer('/items/(a|b)')).toThrow(RoutePathMigrationError);
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
});
