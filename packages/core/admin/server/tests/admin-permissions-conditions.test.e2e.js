'use strict';

const { prop } = require('lodash/fp');
const { createTestBuilder } = require('../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createRequest, createAuthRequest } = require('../../../../../test/helpers/request');
const { createUtils } = require('../../../../../test/helpers/utils');

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

if (edition === 'EE') {
  describe('Admin Permissions - Conditions', () => {
    let strapi;
    let utils;
    const builder = createTestBuilder();
    const requests = {
      public: null,
      admin: null,
    };

    const localTestData = {
      models: {
        article: {
          singularName: 'article',
          pluralName: 'articles',
          displayName: 'Article',
          attributes: {
            title: {
              type: 'string',
            },
            price: {
              type: 'integer',
            },
          },
        },
      },
      entry: {
        name: 'Test Article',
        price: 999,
      },
      role: {
        name: 'foobar',
        description: 'A dummy test role',
      },
      permissions: [
        {
          action: 'plugin::content-manager.explorer.create',
          subject: 'api::article.article',
          fields: null,
          conditions: [],
        },
        {
          action: 'plugin::content-manager.explorer.read',
          subject: 'api::article.article',
          fields: null,
          conditions: ['admin::has-same-role-as-creator'],
        },
        {
          action: 'plugin::content-manager.explorer.delete',
          subject: 'api::article.article',
          fields: null,
          conditions: ['admin::is-creator'],
        },
      ],
      userPassword: 'fooBar42',
      users: [
        { firstname: 'Alice', lastname: 'Foo', email: 'alice.foo@test.com' },
        { firstname: 'Bob', lastname: 'Bar', email: 'bob.bar@test.com' },
      ],
    };

    const createFixtures = async () => {
      // Login with admin and init admin tools
      requests.admin = await createAuthRequest({ strapi });
      requests.public = createRequest({ strapi });

      // Create the foobar role
      const role = await utils.createRole(localTestData.role);

      // Assign permissions to the foobar role
      const permissions = await utils.assignPermissionsToRole(role.id, localTestData.permissions);
      Object.assign(role, { permissions });

      // Create users with the new role & create associated auth requests
      const users = [];

      for (let i = 0; i < localTestData.users.length; ++i) {
        const userFixture = localTestData.users[i];
        const userAttributes = {
          ...userFixture,
          password: localTestData.userPassword,
          roles: [role.id],
        };

        const createdUser = await utils.createUser(userAttributes);

        requests[createdUser.id] = await createAuthRequest({ strapi, userInfo: createdUser });

        users.push(createdUser);
      }

      // Update the local data store
      Object.assign(localTestData, { role, permissions, users });
    };

    const getUserRequest = (idx) => requests[localTestData.users[idx].id];
    const getModelName = () => localTestData.models.article.singularName;

    const deleteFixtures = async () => {
      // Delete users
      const usersId = localTestData.users.map(prop('id'));
      await utils.deleteUsersById(usersId);

      // Delete the foobar role
      await utils.deleteRolesById([localTestData.role.id]);
    };

    beforeAll(async () => {
      await builder.addContentType(localTestData.models.article).build();

      strapi = await createStrapiInstance();
      utils = createUtils(strapi);

      await createFixtures();
    });

    afterAll(async () => {
      await deleteFixtures();

      await strapi.destroy();
      await builder.cleanup();
    });

    test('User A can create an entry', async () => {
      const rq = getUserRequest(0);
      const modelName = getModelName();
      const res = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/api::${modelName}.${modelName}`,
        body: localTestData.entry,
      });

      expect(res.statusCode).toBe(200);
      localTestData.entry = res.body;
    });

    test('User A can read its entry', async () => {
      const { id } = localTestData.entry;
      const modelName = getModelName();
      const rq = getUserRequest(0);
      const res = await rq({
        method: 'GET',
        url: `/content-manager/collection-types/api::${modelName}.${modelName}/${id}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(localTestData.entry);
    });

    test('User B can read the entry created by user A', async () => {
      const { id } = localTestData.entry;
      const modelName = getModelName();
      const rq = getUserRequest(1);
      const res = await rq({
        method: 'GET',
        url: `/content-manager/collection-types/api::${modelName}.${modelName}/${id}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(localTestData.entry);
    });

    test('User B cannot delete the entry created by user A', async () => {
      const { id } = localTestData.entry;
      const modelName = getModelName();
      const rq = getUserRequest(1);
      const res = await rq({
        method: 'DELETE',
        url: `/content-manager/collection-types/api::${modelName}.${modelName}/${id}`,
      });

      expect(res.statusCode).toBe(403);
    });

    test('User A can delete its entry', async () => {
      const { id } = localTestData.entry;
      const modelName = getModelName();
      const rq = getUserRequest(0);
      const res = await rq({
        method: 'DELETE',
        url: `/content-manager/collection-types/api::${modelName}.${modelName}/${id}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(localTestData.entry);
    });
  });
} else {
  describe('Admin Permissions - Conditions ', () => {
    test.skip('Only in EE', () => {});
  });
}
