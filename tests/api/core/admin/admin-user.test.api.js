'use strict';

const { omit } = require('lodash/fp');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const { createUtils } = require('api-tests/utils');

const omitTimestamps = omit(['updatedAt', 'createdAt']);
const omitRegistrationToken = omit(['registrationToken']);

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

describe('Admin User CRUD (api)', () => {
  let rq;
  let utils;
  let strapi;

  // Local test data used across the test suite
  const testData = {
    firstSuperAdminUser: undefined,
    otherSuperAdminUsers: [],
    user: undefined,
    role: undefined,
    superAdminRole: undefined,
  };

  const createUserRole = async () =>
    utils.createRole({
      name: 'user_test_role',
      description: 'Only used for user crud test (api)',
    });

  // Initialization Actions
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    utils = createUtils(strapi);

    testData.role = await createUserRole();

    testData.firstSuperAdminUser = rq.getLoggedUser();
    testData.superAdminRole = await utils.getSuperAdminRole();
  });

  // Cleanup actions
  afterAll(async () => {
    await utils.deleteRolesById([testData.role.id]);

    await strapi.destroy();
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
      data: null,
      error: {
        details: {
          errors: [
            {
              message: 'email is a required field',
              name: 'ValidationError',
              path: ['email'],
            },
          ],
        },
        message: 'email is a required field',
        name: 'ValidationError',
        status: 400,
      },
    });
  });

  test('2. Creates a user (successfully)', async () => {
    const body = {
      email: 'uSer-tEsTs@strapi-e2e.com', // Tested with a camelCase email address
      firstname: 'user_tests-firstname',
      lastname: 'user_tests-lastname',
      roles: [testData.role.id],
    };

    const res = await rq({
      url: '/admin/users',
      method: 'POST',
      body,
      qs: {
        populate: ['roles'],
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).not.toBeNull();
    expect(res.body.data).toHaveProperty('registrationToken');

    // Using the created user as an example for the rest of the tests
    testData.user = omitRegistrationToken(res.body.data);
  });

  test('3. Creates users with superAdmin role (success)', async () => {
    const getBody = (index) => {
      return {
        email: `user-tests${index}@strapi-e2e.com`,
        firstname: 'user_tests-firstname',
        lastname: 'user_tests-lastname',
        roles: [testData.superAdminRole.id],
      };
    };

    for (let i = 0; i < 3; i += 1) {
      const res = await rq({
        url: '/admin/users',
        method: 'POST',
        body: getBody(i),
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).not.toBeNull();

      testData.otherSuperAdminUsers.push(omitRegistrationToken(res.body.data));
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
      data: null,
      error: {
        details: {
          errors: [
            {
              message: 'email must be a `string` type, but the final value was: `42`.',
              name: 'ValidationError',
              path: ['email'],
            },
          ],
        },
        message: 'email must be a `string` type, but the final value was: `42`.',
        name: 'ValidationError',
        status: 400,
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

    test('7.2. Using search', async () => {
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
        ids: users.map((u) => u.id),
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
      data: null,
      error: {
        details: {},
        message: 'You must have at least one user with super admin role.',
        name: 'ValidationError',
        status: 400,
      },
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
      data: null,
      error: {
        details: {},
        message: 'You must have at least one user with super admin role.',
        name: 'ValidationError',
        status: 400,
      },
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
      error: {
        details: {},
        message: 'User does not exist',
        name: 'NotFoundError',
        status: 404,
      },
    });
  });

  test('15. Finds a user (not found)', async () => {
    const res = await rq({
      url: `/admin/users/${testData.user.id}`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      error: {
        details: {},
        message: 'User does not exist',
        name: 'NotFoundError',
        status: 404,
      },
    });
  });

  test('16. Finds a list of users (missing user)', async () => {
    const res = await rq({
      url: `/admin/users`,
      method: 'GET',
      qs: {
        filters: {
          username: testData.user.username,
        },
      },
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
