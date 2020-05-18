// Helpers.
const { registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');

let rq;

const createUser = data => {
  return rq({
    url: '/admin/users',
    method: 'POST',
    body: {
      roles: ['41224d776a326fb40f000001'],
      ...data,
    },
  });
};

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

  describe('GET /registration-info', () => {
    test('Returns registration info', async () => {
      const user = {
        email: 'test@strapi.io',
        firstname: 'test',
        lastname: 'strapi',
      };
      const createRes = await createUser(user);

      const token = createRes.body.data.registrationToken;

      const res = await rq({
        url: `/admin/registration-info?registrationToken=${token}`,
        method: 'GET',
        body: {},
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
        },
      });
    });

    test('Fails on missing registration token', async () => {
      const res = await rq({
        url: '/admin/registration-info',
        method: 'GET',
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'QueryError',
        data: {
          registrationToken: ['registrationToken is a required field'],
        },
      });
    });

    test('Fails on invalid registration token. Without too much info', async () => {
      const res = await rq({
        url: '/admin/registration-info?registrationToken=ABCD',
        method: 'GET',
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid registrationToken',
      });
    });
  });

  describe('GET /register', () => {
    test('Fails on missing payload', async () => {
      const res = await rq({
        url: '/admin/register',
        method: 'POST',
        body: {
          userInfo: {},
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'ValidationError',
        data: {
          registrationToken: ['registrationToken is a required field'],

          'userInfo.firstname': ['userInfo.firstname is a required field'],
          'userInfo.lastname': ['userInfo.lastname is a required field'],
          'userInfo.password': ['userInfo.password is a required field'],
        },
      });
    });

    test('Fails on invalid password', async () => {
      const user = {
        email: 'test1@strapi.io', // FIXME: Have to increment emails until we can delete the users after each test
        firstname: 'test',
        lastname: 'strapi',
      };
      const createRes = await createUser(user);

      const registrationToken = createRes.body.data.registrationToken;

      const res = await rq({
        url: '/admin/register',
        method: 'POST',
        body: {
          registrationToken,
          userInfo: {
            firstname: 'test',
            lastname: 'Strapi',
            password: '123',
          },
        },
      });

      console.log(res.body.data);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'ValidationError',
        data: {
          'userInfo.password': ['userInfo.password must contain at least one uppercase character'],
        },
      });
    });

    test('Registers user correctly', async () => {
      const user = {
        email: 'test2@strapi.io', // FIXME: Have to increment emails until we can delete the users after each test
        firstname: 'test',
        lastname: 'strapi',
      };
      const createRes = await createUser(user);

      const registrationToken = createRes.body.data.registrationToken;

      const userInfo = {
        firstname: 'test',
        lastname: 'Strapi',
        password: '1Test2azda3',
      };

      const res = await rq({
        url: '/admin/register',
        method: 'POST',
        body: {
          registrationToken,
          userInfo,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        token: expect.any(String),
        user: {
          email: user.email,
          firstname: 'test',
          lastname: 'Strapi',
        },
      });

      expect(res.body.data.user.password === userInfo.password).toBe(false);
    });
  });
});
