'use strict';

const _ = require('lodash');
const { login, registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');

const omitTimestamps = obj => _.omit(obj, ['updatedAt', 'createdAt', 'updated_at', 'created_at']);

const getAuthToken = async () => {
  let token = await login();

  if (!token) {
    token = await registerAndLogin();
  }

  return token;
};

const createUserRole = async () => {
  const res = await rq({
    url: '/admin/roles',
    method: 'POST',
    body: {
      name: 'user_test_role',
      description: 'Only used for user crud test (e2e)',
    },
  });

  return res && res.body && res.body.data;
};

const deleteUserRole = async id => {
  await rq({
    url: `/admin/roles/${id}`,
    method: 'DELETE',
  });
};

const createFakeId = id =>
  Number.isInteger(Number(id)) ? Number(id) + 1000 : ['f', 'f', ...id.slice(2)].join('');

let rq;

/**
 * == Test Suite Overview ==
 *
 * N°   Description
 * -------------------------------------------
 * 1.   Create a user (fail/body)
 * 2.   Create a user (success)
 * 3.   Update a user (success)
 * 4.   Update a user (fail/body)
 * 5.   Get a user (success)
 * 6.   Update a user (fail/notFound)
 * 7.  Get a user (fail/notFound)
 * 8.  Get a list of users (success/empty)
 */
describe('Admin User CRUD (e2e)', () => {
  // Local test data used across the test suite
  let testData = {
    user: undefined,
    role: undefined,
  };

  // Initialization Actions
  beforeAll(async () => {
    const token = await getAuthToken();
    rq = createAuthRequest(token);
    testData.role = await createUserRole();
  });

  // Cleanup actions
  afterAll(async () => {
    await deleteUserRole(testData.role.id);
  });

  test('1. Creates a user (wrong body)', async () => {
    const body = {
      firstname: 'user_tests-firstname',
      lastname: 'user_tests-lastname',
      roles: [testData.role.id],
    };

    const res = await rq({
      url: '/admin/users',
      method: 'POST',
      body,
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

  test('2. Creates a user (successfully)', async () => {
    const body = {
      email: 'user-tests@strapi-e2e.com',
      firstname: 'user_tests-firstname',
      lastname: 'user_tests-lastname',
      roles: [testData.role.id],
    };

    const res = await rq({
      url: '/admin/users',
      method: 'POST',
      body,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).not.toBeNull();

    // Using the created user as an example for the rest of the tests
    testData.user = res.body.data;
  });

  test('3. Updates a user (wrong body)', async () => {
    const body = {
      email: 42,
    };

    const res = await rq({
      url: `/admin/users/${testData.user.id}`,
      method: 'PUT',
      body,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'ValidationError',
      data: {
        email: ['email must be a `string` type, but the final value was: `42`.'],
      },
    });
  });

  test('4. Updates a user (successfully)', async () => {
    const body = {
      firstname: 'foobar',
    };

    const res = await rq({
      url: `/admin/users/${testData.user.id}`,
      method: 'PUT',
      body,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).not.toBeNull();
    expect(omitTimestamps(res.body.data)).toMatchObject({
      ...omitTimestamps(testData.user),
      ...body,
    });

    // Update the local copy of the user
    testData.user = res.body.data;
  });

  test('5. Finds a user (successfully)', async () => {
    const res = await rq({
      url: `/admin/users/${testData.user.id}`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject(testData.user);
  });

  describe('6. Finds a list of users (contains user)', () => {
    const expectedBodyFormat = () => ({
      data: {
        pagination: {
          page: 1,
          pageSize: expect.any(Number),
          pageCount: expect.any(Number),
          total: expect.any(Number),
        },
        results: expect.any(Array),
      },
    });

    test('6.1. Using findPage', async () => {
      const res = await rq({
        url: `/admin/users?email=${testData.user.email}`,
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(expectedBodyFormat());
      expect(res.body.data.results).toContainEqual(testData.user);
    });

    test('6.2. Using searchPage', async () => {
      const res = await rq({
        url: `/admin/users?_q=${testData.user.email}`,
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(expectedBodyFormat());
      expect(res.body.data.results).toContainEqual(testData.user);
    });
  });

  test('7. Updates a user (not found)', async () => {
    const body = {
      lastname: 'doe',
    };

    const res = await rq({
      url: `/admin/users/${createFakeId(testData.user.id)}`,
      method: 'PUT',
      body,
    });

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      error: 'Not Found',
      message: 'entry.notFound',
      statusCode: 404,
    });
  });

  test('8. Finds a user (not found)', async () => {
    const res = await rq({
      url: `/admin/users/${createFakeId(testData.user.id)}`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      error: 'Not Found',
      message: 'User does not exist',
      statusCode: 404,
    });
  });

  test('9. Finds a list of users (missing user)', async () => {
    const res = await rq({
      url: `/admin/users?email=non.existing.address@strapi.io`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      pagination: {
        page: 1,
        pageSize: expect.any(Number),
        pageCount: expect.any(Number),
        total: expect.any(Number),
      },
      results: expect.any(Array),
    });
    expect(res.body.data.results).toHaveLength(0);
  });
});
