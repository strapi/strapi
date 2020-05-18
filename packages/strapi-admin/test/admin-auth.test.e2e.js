// Helpers.
const { registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');

let rq;

expect.extend({
  stringOrNull(received) {
    const pass = typeof received === 'string' || received === null;
    if (pass) {
      return {
        message: () => `expected ${received} not to be null or a string`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be null or a string`,
        pass: false,
      };
    }
  },
});

describe('Admin Auth End to End', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);
  }, 60000);

  describe('Login', () => {
    test('Can connect successfuklly', async () => {
      const res = await rq({
        url: '/admin/login',
        method: 'POST',
        body: {
          email: 'admin@strapi.io',
          password: 'pcw123',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        token: expect.any(String),
        user: {
          firstname: expect.stringOrNull(),
          lastname: expect.stringOrNull(),
          username: expect.stringOrNull(),
          email: expect.any(String),
          isActive: expect.any(Boolean),
        },
      });
    });

    test('Fails on invalid password', async () => {
      const res = await rq({
        url: '/admin/login',
        method: 'POST',
        body: {
          email: 'admin@strapi.io',
          password: 'wrongPassword',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid credentials',
      });
    });

    test('Fails on invalid email', async () => {
      const res = await rq({
        url: '/admin/login',
        method: 'POST',
        body: {
          email: 'non-existent-user@strapi.io',
          password: 'pcw123',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid credentials',
      });
    });

    test('Fails on missing credentials', async () => {
      const res = await rq({
        url: '/admin/login',
        method: 'POST',
        body: {
          email: 'non-existent-user@strapi.io',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Missing credentials',
      });
    });
  });

  describe('Renew token', () => {
    test('Renew token', async () => {
      const authRes = await rq({
        url: '/admin/login',
        method: 'POST',
        body: {
          email: 'admin@strapi.io',
          password: 'pcw123',
        },
      });

      expect(authRes.statusCode).toBe(200);
      const { token } = authRes.body.data;

      const res = await rq({
        url: '/admin/renew-token',
        method: 'POST',
        body: {
          token,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual({
        token: expect.any(String),
      });
    });

    test('Fails on invalid token', async () => {
      const res = await rq({
        url: '/admin/renew-token',
        method: 'POST',
        body: {
          token: 'invalid-token',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid token',
      });
    });

    test('Fails on missing token', async () => {
      const res = await rq({
        url: '/admin/renew-token',
        method: 'POST',
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Missing token',
      });
    });
  });
});
