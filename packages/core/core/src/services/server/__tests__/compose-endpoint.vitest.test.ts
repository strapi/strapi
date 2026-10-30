import { describe, expect, it, vi } from 'vitest';
import Router from '@koa/router';
import request from 'supertest';
import type { Core } from '@strapi/types';

import createKoaApp from '../koa';
import createEndpointComposer from '../compose-endpoint';

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

const createServer = (path: string) => {
  const strapi = createStrapi();
  const router = new Router();

  createEndpointComposer(strapi)(
    {
      method: 'GET',
      path,
      handler(ctx) {
        ctx.body = ctx.params;
      },
      info: {},
    },
    { router }
  );

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

  it('returns 404 when a parameter does not match its custom pattern', async () => {
    const { server } = createServer('/users/:id(\\d+)');

    await request(server).get('/users/12').expect(200, { id: '12' });
    await request(server).get('/users/abc').expect(404);
  });

  it('matches an omitted optional parameter that has a custom pattern', async () => {
    const { server } = createServer('/users/:id(\\d+)?');

    await request(server).get('/users').expect(200, {});
    await request(server).get('/users/12').expect(200, { id: '12' });
    await request(server).get('/users/abc').expect(404);
  });
});
