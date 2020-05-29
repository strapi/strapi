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
    // FIXME: Waiting for strapi-admin::roles API
    test.skip('Can create a user successfully', async () => {
      const user = {
        email: 'new-user@strapi.io',
        firstname: 'New',
        lastname: 'User',
        roles: ['41224d776a326fb40f000001'],
      };

      const res = await rq({
        url: '/admin/users',
        method: 'POST',
        body: user,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body).toMatchObject({
        firstname: user.firstname,
        lastname: user.lastname,
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
        message: 'ValidationError',
        data: {
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
        message: 'ValidationError',
        data: {
          firstname: ['firstname must be a `string` type, but the final value was: `1`.'],
        },
      });
    });
  });

  describe('Update a user', () => {
    test('Fails on invalid payload', async () => {
      const body = { firstname: 42 };

      const res = await rq({
        url: '/admin/users/1',
        method: 'PUT',
        body,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toStrictEqual({
        data: {
          firstname: ['firstname must be a `string` type, but the final value was: `42`.'],
        },
        error: 'Bad Request',
        message: 'ValidationError',
        statusCode: 400,
      });
    });

    test('Fails on user not found', async () => {
      const body = { firstname: 'foo' };

      const res = await rq({
        url: '/admin/users/999999',
        method: 'PUT',
        body,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toStrictEqual({
        error: 'Bad Request',
        message: 'User does not exist',
        statusCode: 400,
      });
    });

    test('Can update a user successfully', async () => {
      const body = { firstname: 'foo' };

      const res = await rq({
        url: '/admin/users/1',
        method: 'PUT',
        body,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toStrictEqual({
        data: {
          email: 'admin@strapi.io',
          firstname: 'foo',
          lastname: 'admin',
          username: null,
          id: 1,
          isActive: true,
          registrationToken: null,
          roles: [],
        },
      });
    });
  });

  describe('Fetch a user', () => {
    test('User does not exist', async () => {
      const res = await rq({
        url: '/admin/users/999',
        method: 'GET',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toStrictEqual({
        error: 'Bad Request',
        message: 'User does not exist',
        statusCode: 400,
      });
    });

    test('Find one user successfully', async () => {
      const res = await rq({
        url: '/admin/users/1',
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toStrictEqual({
        data: {
          email: 'admin@strapi.io',
          firstname: 'foo',
          lastname: 'admin',
          username: null,
          id: 1,
          isActive: true,
          registrationToken: null,
          roles: [],
        },
      });
    });
  });

  describe('Fetch a list of user', () => {
    test('Using findPage', async () => {
      const res = await rq({
        url: '/admin/users',
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toStrictEqual({
        data: {
          pagination: {
            page: 1,
            pageSize: 100,
            total: 1,
            pageCount: 1,
          },
          results: [
            {
              email: 'admin@strapi.io',
              firstname: 'foo',
              lastname: 'admin',
              username: null,
              registrationToken: null,
              roles: [],
              id: 1,
              isActive: true,
            },
          ],
        },
      });
    });

    test('Using searchPage', async () => {
      const res = await rq({
        url: '/admin/users?_q=foo',
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toStrictEqual({
        data: {
          pagination: {
            page: 1,
            pageSize: 100,
            total: 1,
            pageCount: 1,
          },
          results: [
            {
              email: 'admin@strapi.io',
              firstname: 'foo',
              lastname: 'admin',
              username: null,
              registrationToken: null,
              roles: [],
              id: 1,
              isActive: true,
            },
          ],
        },
      });
    });
  });
});
