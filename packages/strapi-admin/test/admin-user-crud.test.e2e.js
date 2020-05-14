// Helpers.
const { registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');

let rq;

describe('Admin User CRUD End to End', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);
  }, 60000);

  describe('Create a new user', () => {
    test('Can create a user successfully', async () => {
      const user = {
        email: 'new-user@strapi.io',
        firstname: 'New',
        lastname: 'User',
        roles: [1, 2],
      };

      const res = await rq({
        url: '/admin/users',
        method: 'POST',
        body: user,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body).toMatchObject({
        id: 2,
        firstname: user.firstname,
        lastname: user.lastname,
        username: null,
        email: user.email,
        registrationToken: expect.any(String),
        isActive: false,
        roles: [],
      });
    });

    test('Fails on missing field (email)', async () => {
      const user = {
        firstname: 'New',
        lastname: 'User',
        roles: [1, 2],
      };

      const res = await rq({
        url: '/admin/users',
        method: 'POST',
        body: user,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
        message: {
          email: ['email is a required field'],
        },
      });
    });

    test('Fails on invalid field type (firstname)', async () => {
      const user = {
        email: 'new-user@strapi.io',
        firstname: 1,
        lastname: 'User',
        roles: [1, 2],
      };

      const res = await rq({
        url: '/admin/users',
        method: 'POST',
        body: user,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
        message: {
          firstname: ['firstname must be a `string` type, but the final value was: `1`.'],
        },
      });
    });
  });
});
