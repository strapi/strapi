import path from 'path';
import fs from 'node:fs/promises';
import request from 'supertest';

import { createStrapiInstance } from 'api-tests/strapi';

/**
 * Routes defined with `factories.defineRoute`, in an API module of the test app:
 * - `refunds` and `private-refunds` have a function handler that reads `ctx.input`;
 * - `pay` references a core controller action, which parses with `payRoute.parseInput(ctx)` and then
 *   calls `this.sanitizeInput`. The route keeps its string handler, so Strapi generates its scope.
 *
 * The module files are written before the app boots and removed after.
 */
const API_NAME = 'validated-order';
const UID = `api::${API_NAME}.${API_NAME}`;
const PAY_ACTION = `${UID}.pay`;

const files = {
  [`content-types/${API_NAME}/schema.json`]: JSON.stringify({
    kind: 'collectionType',
    collectionName: 'validated_orders',
    info: {
      singularName: API_NAME,
      pluralName: 'validated-orders',
      displayName: 'Validated order',
    },
    options: { draftAndPublish: false },
    attributes: { title: { type: 'string' }, amount: { type: 'integer' } },
  }),
  [`routes/${API_NAME}.js`]: `
    const { factories } = require('@strapi/strapi');
    const { z } = require('@strapi/utils');

    const echo = (ctx) => ({
      input: ctx.input,
      raw: { params: ctx.params, query: ctx.query, body: ctx.request.body },
    });

    const refundRequest = {
      params: { id: z.coerce.number().int() },
      query: { notify: z.stringbool().optional() },
      body: { 'application/json': z.object({ amount: z.number().positive() }) },
    };

    const refundRoute = factories.defineRoute({
      method: 'POST',
      path: '/validated-orders/:id/refunds',
      request: refundRequest,
      config: { auth: false },
      handler: echo,
    });

    const privateRefundRoute = factories.defineRoute({
      method: 'POST',
      path: '/validated-orders/:id/private-refunds',
      request: refundRequest,
      handler: echo,
    });

    const payRoute = factories.defineRoute({
      method: 'POST',
      path: '/validated-orders/:id/pay',
      handler: '${PAY_ACTION}',
      request: {
        params: { id: z.coerce.number().int() },
        query: { notify: z.stringbool().optional() },
        body: {
          'application/json': z.object({
            data: z.object({ title: z.string(), amount: z.number().int() }),
          }),
        },
      },
    });

    module.exports = { payRoute, routes: [refundRoute, privateRefundRoute, payRoute] };
  `,
  [`controllers/${API_NAME}.js`]: `
    const { factories } = require('@strapi/strapi');
    const { payRoute } = require('../routes/${API_NAME}');

    module.exports = factories.createCoreController('${UID}', () => ({
      async pay(ctx) {
        const input = payRoute.parseInput(ctx);
        const sanitized = await this.sanitizeInput(input.body.data, ctx);

        return { input, sanitized };
      },
    }));
  `,
};

const pathsOf = (res: request.Response) =>
  res.body.error.details.errors.map(({ path: issuePath }: { path: string[] }) =>
    issuePath.join('.')
  );

describe('Routes defined with factories.defineRoute', () => {
  let strapi;
  let apiDir: string;
  let agent: ReturnType<typeof request>;

  const grantPublicPay = async () => {
    const role = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } });

    await strapi.db
      .query('plugin::users-permissions.permission')
      .create({ data: { action: PAY_ACTION, role: role.id } });
  };

  beforeAll(async () => {
    apiDir = path.join(path.dirname(process.env.ENV_PATH as string), 'src/api', API_NAME);

    for (const [file, contents] of Object.entries(files)) {
      await fs.mkdir(path.dirname(path.join(apiDir, file)), { recursive: true });
      await fs.writeFile(path.join(apiDir, file), contents);
    }

    strapi = await createStrapiInstance({
      bypassAuth: false,
      register({ strapi: s }) {
        s.contentAPI.addQueryParams({
          search: {
            schema: (z) => z.string().max(10).optional(),
            matchRoute: (route) => route.path.startsWith('/validated-orders'),
          },
        });
      },
    });

    agent = request(strapi.server.httpServer);
  });

  afterAll(async () => {
    await strapi.db
      .query('plugin::users-permissions.permission')
      .deleteMany({ where: { action: PAY_ACTION } });
    await strapi.destroy();
    await fs.rm(apiDir, { recursive: true, force: true });
  });

  describe('with a function handler', () => {
    test('hands coerced values to the handler and keeps the raw values', async () => {
      const res = await agent
        .post('/api/validated-orders/7/refunds?notify=false&extra=1')
        .send({ amount: 5, note: 'late' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        input: { params: { id: 7 }, query: { notify: false }, body: { amount: 5 } },
        raw: {
          params: { id: '7' },
          query: { notify: 'false', extra: '1' },
          body: { amount: 5, note: 'late' },
        },
      });
    });

    test('answers one 400 that lists every params, query and body issue', async () => {
      const res = await agent
        .post('/api/validated-orders/abc/refunds?notify=maybe')
        .send({ amount: '5' });

      expect(res.status).toBe(400);
      expect(res.body.error.name).toBe('ValidationError');
      expect(pathsOf(res)).toEqual(['params.id', 'query.notify', 'body.amount']);
    });

    test('answers 415 for a body sent with an undeclared media type', async () => {
      const res = await agent
        .post('/api/validated-orders/7/refunds')
        .type('form')
        .send({ amount: '5' });

      expect(res.status).toBe(415);
      expect(res.body.error.name).toBe('UnsupportedMediaTypeError');
    });

    test('parses a param added with addQueryParams', async () => {
      const res = await agent
        .post('/api/validated-orders/7/refunds?search=shoes')
        .send({ amount: 5 });

      expect(res.status).toBe(200);
      expect(res.body.input.query).toEqual({ search: 'shoes' });
    });

    test('authenticates before it parses', async () => {
      const res = await agent
        .post('/api/validated-orders/abc/private-refunds')
        .send({ amount: '5' });

      expect(res.status).toBe(401);
    });
  });

  describe('with a controller action', () => {
    test('generates the permission scope from the action name', () => {
      const route = strapi.apis[API_NAME].routes[API_NAME].routes.find(
        ({ path: routePath }) => routePath === '/validated-orders/:id/pay'
      );

      expect(route.config.auth.scope).toEqual([PAY_ACTION]);
      expect(Object.keys(route)).not.toContain('parseInput');
    });

    test('authorizes before it parses', async () => {
      const res = await agent
        .post('/api/validated-orders/abc/pay?notify=maybe')
        .send({ data: { title: 5, amount: 'x' } });

      expect(res.status).toBe(403);
    });

    describe('once the public role may call the action', () => {
      beforeAll(grantPublicPay);

      test('hands coerced values to the action, which sanitizes them', async () => {
        const res = await agent
          .post('/api/validated-orders/7/pay?notify=true&extra=1')
          .send({ data: { title: 't', amount: 5, id: 99, extra: 1 } });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          input: {
            params: { id: 7 },
            query: { notify: true },
            body: { data: { title: 't', amount: 5 } },
          },
          sanitized: { title: 't', amount: 5 },
        });
      });

      test('answers one 400 that lists every params, query and body issue', async () => {
        const res = await agent
          .post('/api/validated-orders/abc/pay?notify=maybe')
          .send({ data: { title: 5, amount: 'x' } });

        expect(res.status).toBe(400);
        expect(pathsOf(res)).toEqual([
          'params.id',
          'query.notify',
          'body.data.title',
          'body.data.amount',
        ]);
      });

      test('answers 415 for a body sent with an undeclared media type', async () => {
        const res = await agent
          .post('/api/validated-orders/7/pay')
          .type('form')
          .send({ title: 't' });

        expect(res.status).toBe(415);
      });

      test('parses a param added with addQueryParams', async () => {
        const res = await agent
          .post('/api/validated-orders/7/pay?search=shoes')
          .send({ data: { title: 't', amount: 5 } });

        expect(res.status).toBe(200);
        expect(res.body.input.query).toEqual({ search: 'shoes' });
      });
    });
  });
});
