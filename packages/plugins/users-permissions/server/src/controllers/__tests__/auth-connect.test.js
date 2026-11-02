'use strict';

/* eslint-env jest */

const Router = require('@koa/router');

const authRoutes = require('../../routes/content-api/auth');

jest.mock('../../utils/oauth-connect', () => ({
  createOAuthConnectMiddleware: () => (ctx) => {
    ctx.body = 'redirected to the provider';
  },
}));

describe('Auth controller - connect', () => {
  const router = new Router();
  authRoutes({}).forEach(({ method, path, handler }) => {
    router.register(path, [method], () => undefined, { name: handler });
  });

  beforeEach(() => {
    global.strapi = {
      store: () => ({ get: async () => ({ google: { enabled: true } }) }),
      config: { server: { url: 'http://localhost:1337' } },
    };
  });

  it.each(['/connect/google', '/connect/google/callback'])(
    'routes %s to the google provider',
    async (url) => {
      expect(router.match(url, 'GET').pathAndMethod.map((layer) => layer.name)).toEqual([
        'auth.connect',
      ]);

      const controller = require('../auth')({ strapi: global.strapi });
      const ctx = { request: { url }, query: {} };

      await controller.connect(ctx, jest.fn());

      expect(ctx.body).toBe('redirected to the provider');
    }
  );
});
