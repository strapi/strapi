import os from 'os';
import Router from '@koa/router';
import { generate } from '@strapi/openapi';
import type { Core } from '@strapi/types';
import { sanitizeRouteForSerialization, z } from '@strapi/utils';
import request from 'supertest';
import { beforeAll, describe, expect, test } from 'vitest';

import { defineRoute } from '../factories';
import { body } from '../middlewares/body';
import { errors } from '../middlewares/errors';
import { query } from '../middlewares/query';
import createContentAPI from '../services/content-api';
import { createServer } from '../services/server';
import composeEndpoint from '../services/server/compose-endpoint';
import createKoaApp from '../services/server/koa';

/**
 * Sends real HTTP requests through the middlewares a Strapi app runs for a route: the errors, query
 * (qs) and body (koa-body) middlewares, then the route chain built by `compose-endpoint`. Only the
 * auth service is replaced: a request is authenticated when it sends `Authorization: Bearer ok`.
 */
const createApp = (routes: Core.RouteInput[], controllers: Record<string, unknown> = {}) => {
  const app = createKoaApp({});
  const strapi = {
    server: { app },
    controller: (uid: string) => controllers[uid],
    config: { get: (_key: string, defaultValue?: unknown) => defaultValue },
    plugin: () => undefined,
    get(name: string) {
      if (name === 'policies') {
        return { resolve: () => [] };
      }

      if (name === 'auth') {
        return {
          authenticate: (ctx: any, next: () => Promise<unknown>) =>
            ctx.get('authorization') === 'Bearer ok' ? next() : ctx.unauthorized(),
          verify: async () => undefined,
        };
      }

      return undefined;
    },
  } as unknown as Core.Strapi;

  const router = new Router();

  app.use(errors({}, { strapi }) as Core.MiddlewareHandler);
  query({}, { strapi });
  app.use(body({}, { strapi }) as Core.MiddlewareHandler);

  for (const route of routes) {
    composeEndpoint(strapi)({ ...route, info: {} } as Core.Route, { router });
  }

  app.use(router.routes());

  return app.callback();
};

const echo = (ctx: any) => ({
  input: ctx.input,
  raw: { params: ctx.params, query: ctx.query, body: ctx.request.body },
});

// A route whose handler is a controller action: the action parses with the route's `parseInput`.
const payRoute = defineRoute({
  method: 'POST',
  path: '/orders/:id/pay',
  handler: 'api::order.order.pay',
  request: {
    params: { id: z.coerce.number().int() },
    body: { 'application/json': z.object({ amount: z.number() }) },
  },
});

const orderController = {
  pay(ctx: any) {
    return { input: payRoute.parseInput(ctx) };
  },
};

// Registration replaces `route.request` when it merges the params of `addQueryParams`.
const searchRoute = defineRoute({
  method: 'GET',
  path: '/search',
  request: { query: { page: z.coerce.number() } },
  handler: echo,
});
searchRoute.request = {
  ...searchRoute.request,
  query: { ...searchRoute.request.query, term: z.string() },
} as typeof searchRoute.request;

describe('factories.defineRoute', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp(
      [
        defineRoute({
          method: 'POST',
          path: '/orders/:id/refunds',
          request: {
            params: { id: z.coerce.number().int() },
            query: { notify: z.stringbool().optional() },
            body: { 'application/json': z.object({ amount: z.number().positive() }) },
          },
          handler: echo,
        }),
        defineRoute({
          method: 'GET',
          path: '/orders',
          request: {
            query: {
              pagination: z.object({ page: z.coerce.number().int().min(1) }).optional(),
            },
          },
          handler: echo,
        }),
        // A route with the same schemas, not defined with the helper: nothing is parsed.
        {
          method: 'GET',
          path: '/legacy/:id',
          request: { params: { id: z.coerce.number().int() } },
          handler: echo,
        },
        payRoute,
        searchRoute,
      ],
      { 'api::order.order': orderController }
    );
  });

  test('hands the parsed request to the handler and keeps the raw values', async () => {
    const res = await request(app)
      .post('/orders/7/refunds?notify=false&extra=1')
      .set('Authorization', 'Bearer ok')
      .send({ amount: 5, note: 'late' })
      .expect(200);

    expect(res.body).toEqual({
      input: { params: { id: 7 }, query: { notify: false }, body: { amount: 5 } },
      raw: {
        params: { id: '7' },
        query: { notify: 'false', extra: '1' },
        body: { amount: 5, note: 'late' },
      },
    });
  });

  test('parses nested qs objects', async () => {
    const res = await request(app)
      .get('/orders?pagination[page]=2')
      .set('Authorization', 'Bearer ok')
      .expect(200);

    expect(res.body.input).toEqual({ query: { pagination: { page: 2 } } });
  });

  test('answers 400 with a ValidationError that lists every issue', async () => {
    const res = await request(app)
      .post('/orders/abc/refunds?notify=maybe')
      .set('Authorization', 'Bearer ok')
      .send({ amount: '5' })
      .expect(400);

    expect(res.body).toMatchObject({
      data: null,
      error: { status: 400, name: 'ValidationError' },
    });
    expect(res.body.error.details.errors.map(({ path }: { path: string[] }) => path)).toEqual([
      ['params', 'id'],
      ['query', 'notify'],
      ['body', 'amount'],
    ]);
  });

  test('answers 415 when the body is not sent with a declared media type', async () => {
    const res = await request(app)
      .post('/orders/7/refunds')
      .set('Authorization', 'Bearer ok')
      .type('form')
      .send({ amount: '5' })
      .expect(415);

    expect(res.body.error).toMatchObject({
      status: 415,
      name: 'UnsupportedMediaTypeError',
      message: 'Request body must be sent as application/json',
    });
  });

  test('parses for a controller action that calls route.parseInput', async () => {
    const res = await request(app)
      .post('/orders/7/pay')
      .set('Authorization', 'Bearer ok')
      .send({ amount: 5 })
      .expect(200);

    expect(res.body).toEqual({ input: { params: { id: 7 }, body: { amount: 5 } } });

    const invalid = await request(app)
      .post('/orders/7/pay')
      .set('Authorization', 'Bearer ok')
      .send({ amount: 'five' })
      .expect(400);

    expect(invalid.body.error.details.errors[0].path).toEqual(['body', 'amount']);
  });

  test('parses the params that registration adds to the route', async () => {
    const res = await request(app)
      .get('/search?page=2&term=shoes')
      .set('Authorization', 'Bearer ok')
      .expect(200);

    expect(res.body.input).toEqual({ query: { page: 2, term: 'shoes' } });
  });

  test('authenticates before it parses', async () => {
    await request(app).post('/orders/abc/refunds').send({ amount: '5' }).expect(401);
    await request(app).post('/orders/abc/pay').send({ amount: '5' }).expect(401);
  });

  test('leaves routes defined without the helper unchanged', async () => {
    const res = await request(app).get('/legacy/abc').set('Authorization', 'Bearer ok').expect(200);

    expect(res.body).toEqual({ raw: { params: { id: 'abc' }, query: {}, body: {} } });
  });

  test('rejects a schema that can never accept a query string value', () => {
    expect(() =>
      defineRoute({
        method: 'GET',
        path: '/orders',
        request: { query: { page: z.number() } },
        handler: echo,
      })
    ).toThrow(
      'defineRoute GET /orders: request.query.page: query values are strings, so z.number() fails on every value. Use z.coerce.number() instead.'
    );
  });

  test('documents the route in OpenAPI from the same schemas', () => {
    const route = defineRoute({
      method: 'POST',
      path: '/orders/:id/refunds',
      request: {
        params: { id: z.coerce.number().int() },
        query: { notify: z.stringbool().optional() },
        body: { 'application/json': z.object({ amount: z.number().positive() }) },
      },
      handler: echo,
    });
    const strapi = {
      // Strapi adds `info` when it loads the routes of an API.
      apis: {
        order: {
          routes: {
            order: {
              type: 'content-api',
              routes: [{ ...route, info: { apiName: 'order', type: 'content-api' } }],
            },
          },
        },
      },
      plugins: {},
      admin: { routes: {} },
      config: {
        get: (key: string, defaultValue?: unknown) =>
          key === 'info' ? { name: 'app', version: '0.0.0' } : defaultValue,
      },
      contentAPISchemaRegistry: new Map(),
    } as unknown as Core.Strapi;

    const { document } = generate(strapi, { type: 'content-api' });
    const operation = document.paths?.['/orders/{id}/refunds']?.post;

    expect(operation?.parameters).toMatchObject([
      { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
      { name: 'notify', in: 'query', required: false, schema: { type: 'boolean' } },
    ]);
    expect(operation?.requestBody).toMatchObject({
      content: {
        'application/json': {
          schema: { type: 'object', properties: { amount: { type: 'number' } } },
        },
      },
    });
  });

  test('checks the schemas of a controller-action route when it is defined', () => {
    expect(() =>
      defineRoute({
        method: 'GET',
        path: '/orders/:id',
        handler: 'api::order.order.findOne',
        request: { params: { id: z.number() } },
      })
    ).toThrow('defineRoute GET /orders/:id: request.params.id: params values are strings');
  });

  test('rejects a handler that is neither a function nor an action name', () => {
    expect(() =>
      defineRoute({
        method: 'GET',
        path: '/orders',
        handler: [echo] as any,
      })
    ).toThrow(
      'defineRoute GET /orders: the handler must be a function or a controller action name'
    );
  });
});

describe('route listing, serialization and OpenAPI', () => {
  // A Strapi app reduced to what route registration, `getRoutesMap` and OpenAPI read. Its routes go
  // through the real `server.initRouting()`.
  const createRegisteredApp = (routes: Core.RouteInput[]) => {
    const app: any = {
      config: {
        get(key: string, defaultValue?: unknown) {
          if (key === 'api.rest.prefix') return '/api';
          if (key === 'info') return { name: 'app', version: '0.0.0' };
          return defaultValue;
        },
      },
      get: (name: string) => (name === 'policies' ? { resolve: () => [] } : undefined),
      log: { error: () => undefined },
      dirs: { app: { root: os.tmpdir() } },
      admin: { routes: {} },
      plugins: {},
      apis: { order: { routes: { order: { type: 'content-api', routes } } } },
      controller(uid: string) {
        return uid === 'api::order.order' ? orderController : undefined;
      },
      contentAPISchemaRegistry: new Map(),
    };

    app.api = (name: string) => app.apis[name];
    app.contentAPI = createContentAPI(app);
    app.server = createServer(app);
    app.server.initRouting();

    return app;
  };

  test('do not carry parseInput', async () => {
    const route = defineRoute({
      method: 'POST',
      path: '/orders/:id/pay',
      handler: 'api::order.order.pay',
      request: { params: { id: z.coerce.number().int() } },
    });

    expect(typeof route.parseInput).toBe('function');
    expect(Object.keys(route)).not.toContain('parseInput');
    expect({ ...route }).not.toHaveProperty('parseInput');
    expect(sanitizeRouteForSerialization(route)).not.toHaveProperty('parseInput');

    const app = createRegisteredApp([route]);

    try {
      const routesMap = await app.contentAPI.getRoutesMap();

      // Registration generates the permission scope from the action name.
      expect(routesMap['api::order']).toEqual([
        expect.objectContaining({
          method: 'POST',
          path: '/api/orders/:id/pay',
          handler: 'api::order.order.pay',
          config: { auth: { scope: ['api::order.order.pay'] } },
        }),
      ]);
      expect(JSON.stringify(routesMap)).not.toContain('parseInput');

      const { document } = generate(app, { type: 'content-api' });

      expect(document.paths?.['/orders/{id}/pay']?.post?.parameters).toMatchObject([
        { name: 'id', in: 'path', schema: { type: 'integer' } },
      ]);
      expect(JSON.stringify(document)).not.toContain('parseInput');
    } finally {
      await app.server.destroy();
    }
  });
});
