'use strict';

/* eslint-env jest */

const authRoutes = require('../../routes/content-api/auth');

jest.mock('../../utils/oauth-connect', () => ({
  createOAuthConnectMiddleware: () => (ctx) => {
    ctx.body = 'redirected to the provider';
  },
}));

describe('Auth controller - connect', () => {
  beforeEach(() => {
    global.strapi = {
      store: () => ({ get: async () => ({ google: { enabled: true } }) }),
      config: { server: { url: 'http://localhost:1337' } },
    };
  });

  // The core router tests check that this path matches `/connect/google/callback`.
  it('serves every provider path from one route, kept in v6 syntax', () => {
    const route = authRoutes({}).find(({ handler }) => handler === 'auth.connect');

    expect(route.path).toBe('/connect/(.*)');
    expect(route[Symbol.for('strapi.route.keepV6Path')]).toBe(true);
  });

  it.each(['/connect/google', '/connect/google/callback'])(
    'connects %s to the google provider',
    async (url) => {
      const controller = require('../auth')({ strapi: global.strapi });
      const ctx = { request: { url }, query: {} };

      await controller.connect(ctx, jest.fn());

      expect(ctx.body).toBe('redirected to the provider');
    }
  );
});
