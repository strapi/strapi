'use strict';

const _ = require('lodash');
const { login, registerAndLogin, getUser } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');
const { SUPER_ADMIN_CODE } = require('../services/constants');

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

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

const getSuperAdminRole = async () => {
  const res = await rq({
    url: '/admin/roles',
    method: 'GET',
  });

  return res.body.data.find(r => r.code === SUPER_ADMIN_CODE);
};

let rq;

/**
 * == Test Suite Overview ==
 *
 * N°   Description
 * -------------------------------------------
 * 1.  Creates a user (wrong body)
 * 2.  Creates a user (successfully)
 * 3.  Creates users with superAdmin role (success)
 * 4.  Updates a user (wrong body)
 * 5.  Updates a user (successfully)
 * 6.  Finds a user (successfully)
 * 7.  Finds a list of users (contains user)
 * 8.  Deletes a user (successfully)
 * 9.  Deletes a user (not found)
 * 10. Deletes 2 super admin users (successfully)
 * 11. Deletes a super admin user (successfully)
 * 12. Deletes last super admin user (bad request)
 * 13. Deletes last super admin user in batch (bad request)
 * 14. Updates a user (not found)
 * 15. Finds a user (not found)
 * 16. Finds a list of users (missing user)
 */

describe('Admin User CRUD (e2e)', () => {
  // Local test data used across the test suite
  let testData = {
    firstSuperAdminUser: undefined,
    otherSuperAdminUsers: [],
    user: undefined,
    role: undefined,
    superAdminRole: undefined,
  };

  // Initialization Actions
  beforeAll(async () => {
    const token = await getAuthToken();
    rq = createAuthRequest(token);

    if (edition === 'EE') {
      testData.role = await createUserRole();
    } else {
      testData.role = (
        await rq({
          url: '/admin/roles',
          method: 'GET',
        })
      ).body.data[0];
    }

    testData.firstSuperAdminUser = await getUser();
    testData.superAdminRole = await getSuperAdminRole();
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

  test('3. Creates users with superAdmin role (success)', async () => {
    const getBody = index => {
      return {
        email: `user-tests${index}@strapi-e2e.com`,
        firstname: 'user_tests-firstname',
        lastname: 'user_tests-lastname',
        roles: [testData.superAdminRole.id],
      };
    };

    for (let i = 0; i < 3; i++) {
      const res = await rq({
        url: '/admin/users',
        method: 'POST',
        body: getBody(i),
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).not.toBeNull();

      testData.otherSuperAdminUsers.push(res.body.data);
    }
  });

  test('4. Updates a user (wrong body)', async () => {
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

  test('5. Updates a user (successfully)', async () => {
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

  test('6. Finds a user (successfully)', async () => {
    const res = await rq({
      url: `/admin/users/${testData.user.id}`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject(testData.user);
  });

  describe('7. Finds a list of users (contains user)', () => {
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

    test('7.1. Using findPage', async () => {
      const res = await rq({
        url: `/admin/users?email=${testData.user.email}`,
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(expectedBodyFormat());
      expect(res.body.data.results).toContainEqual(testData.user);
    });

    test('7.2. Using searchPage', async () => {
      const res = await rq({
        url: `/admin/users?_q=${testData.user.email}`,
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(expectedBodyFormat());
      expect(res.body.data.results).toContainEqual(testData.user);
    });
  });

  test('8. Deletes a user (successfully)', async () => {
    const res = await rq({
      url: `/admin/users/${testData.user.id}`,
      method: 'DELETE',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject(testData.user);
  });

  test('9. Deletes a user (not found)', async () => {
    const res = await rq({
      url: `/admin/users/${testData.user.id}`,
      method: 'DELETE',
    });

    expect(res.statusCode).toBe(404);
  });

  test('10. Deletes 2 super admin users (successfully)', async () => {
    const users = testData.otherSuperAdminUsers.splice(0, 2);
    const res = await rq({
      url: `/admin/users/batch-delete`,
      method: 'POST',
      body: {
        ids: users.map(u => u.id),
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject(users);
  });

  test('11. Deletes a super admin user (successfully)', async () => {
    const user = testData.otherSuperAdminUsers.pop();
    const res = await rq({
      url: `/admin/users/${user.id}`,
      method: 'DELETE',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject(user);
  });

  test('12. Deletes last super admin user (bad request)', async () => {
    const res = await rq({
      url: `/admin/users/${testData.firstSuperAdminUser.id}`,
      method: 'DELETE',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'ValidationError',
      data: 'You must have at least one user with super admin role.',
    });
  });

  test('13. Deletes last super admin user in batch (bad request)', async () => {
    const res = await rq({
      url: `/admin/users/batch-delete`,
      method: 'POST',
      body: {
        ids: [testData.firstSuperAdminUser.id],
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'ValidationError',
      data: 'You must have at least one user with super admin role.',
    });
  });

  test('14. Updates a user (not found)', async () => {
    const body = {
      lastname: 'doe',
    };

    const res = await rq({
      url: `/admin/users/${testData.user.id}`,
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

  test('15. Finds a user (not found)', async () => {
    const res = await rq({
      url: `/admin/users/${testData.user.id}`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      error: 'Not Found',
      message: 'User does not exist',
      statusCode: 404,
    });
  });

  test('16. Finds a list of users (missing user)', async () => {
    const res = await rq({
      url: `/admin/users?email=${testData.user.email}`,
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
