'use strict';

const { prop } = require('lodash/fp');
const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createRequest, createAuthRequest } = require('api-tests/request');
const { createUtils } = require('api-tests/utils');

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
        draftAndPublish: true,
        attributes: {
          title: {
            type: 'string',
          },
          price: {
            type: 'integer',
          },
          category: {
            type: 'relation',
            relation: 'manyToOne',
            target: 'api::category.category',
          },
        },
      },
      category: {
        singularName: 'category',
        pluralName: 'categories',
        displayName: 'Category',
        draftAndPublish: true,
        attributes: {
          name: {
            type: 'string',
          },
        },
      },
    },
    cheapArticle: {
      title: 'Cheap Article',
      price: 999,
    },
    expensiveArticle: {
      title: 'Expensive Article',
      price: 1001,
    },
    categories: [{ name: 'Cheap' }, { name: 'Expensive' }],
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
        action: 'plugin::content-manager.explorer.update',
        subject: 'api::article.article',
        fields: null,
        conditions: ['plugin::test.cheap-article'],
      },
      {
        action: 'plugin::content-manager.explorer.read',
        subject: 'api::article.article',
        fields: null,
        conditions: ['plugin::test.cheap-article'],
      },
      {
        action: 'plugin::content-manager.explorer.delete',
        subject: 'api::article.article',
        fields: null,
        conditions: ['plugin::test.cheap-article'],
      },
      {
        action: 'plugin::content-manager.explorer.publish',
        subject: 'api::article.article',
        fields: null,
        conditions: ['plugin::test.cheap-article'],
      },
    ],
    customConditions: [
      {
        displayName: 'Custom Condition',
        name: 'cheap-article',
        plugin: 'test',
        handler: () => ({
          'category.name': { $eq: 'Cheap' },
        }),
      },
    ],
    userPassword: 'fooBar42',
    users: [{ firstname: 'Alice', lastname: 'Foo', email: 'alice.foo@test.com' }],
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

    for (let i = 0; i < localTestData.users.length; i += 1) {
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

    // Create categories
    for (const category of localTestData.categories) {
      const { body } = await requests.admin({
        method: 'POST',
        url: `/content-manager/collection-types/api::category.category`,
        body: category,
      });
      category.id = body.id;
    }

    // Update the local data store
    Object.assign(localTestData, { role, permissions, users });
  };

  const getUserRequest = (idx) => requests[localTestData.users[idx].id];

  const deleteFixtures = async () => {
    // Delete users
    const usersId = localTestData.users.map(prop('id'));
    await utils.deleteUsersById(usersId);

    // Delete the foobar role
    await utils.deleteRolesById([localTestData.role.id]);
  };

  beforeAll(async () => {
    await builder
      .addContentType(localTestData.models.category)
      .addContentType(localTestData.models.article)
      .build();

    strapi = await createStrapiInstance({
      bootstrap: ({ strapi }) => {
        // Create custom conditions
        return strapi.admin.services.permission.conditionProvider.registerMany(
          localTestData.customConditions
        );
      },
    });
    utils = createUtils(strapi);

    await createFixtures();
  });

  afterAll(async () => {
    await deleteFixtures();

    await strapi.destroy();
    await builder.cleanup();
  });

  test('User can create articles', async () => {
    const rq = getUserRequest(0);

    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/api::article.article`,
      body: { ...localTestData.cheapArticle, category: localTestData.categories[0].id },
    });

    const resExpensive = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/api::article.article`,
      body: { ...localTestData.expensiveArticle, category: localTestData.categories[1].id },
    });

    expect(res.statusCode).toBe(200);
    expect(resExpensive.statusCode).toBe(200);

    localTestData.cheapArticle.id = res.body.id;
    localTestData.expensiveArticle.id = resExpensive.body.id;
  });

  test('User can read cheap articles', async () => {
    const { id } = localTestData.cheapArticle;
    const rq = getUserRequest(0);
    const res = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::article.article/${id}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(localTestData.cheapArticle);
  });

  test('User cannot read expensive articles', async () => {
    const { id } = localTestData.expensiveArticle;
    const rq = getUserRequest(0);
    const res = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::article.article/${id}`,
    });

    expect(res.statusCode).toBe(403);
  });

  test('User can update cheap articles', async () => {
    const { id } = localTestData.cheapArticle;
    const rq = getUserRequest(0);
    const res = await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/api::article.article/${id}`,
      body: { ...localTestData.cheapArticle, title: 'New title' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ...localTestData.cheapArticle, title: 'New title' });
    localTestData.cheapArticle.title = 'New title';
  });

  test('User cannot update expensive articles', async () => {
    const { id } = localTestData.expensiveArticle;
    const rq = getUserRequest(0);
    const res = await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/api::article.article/${id}`,
      body: { ...localTestData.expensiveArticle, title: 'New title' },
    });

    expect(res.statusCode).toBe(403);
  });

  test('User can publish cheap articles', async () => {
    const { id } = localTestData.cheapArticle;
    const rq = getUserRequest(0);
    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/api::article.article/${id}/actions/publish`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(localTestData.cheapArticle);
  });

  test('User cannot publish expensive articles', async () => {
    const { id } = localTestData.expensiveArticle;
    const rq = getUserRequest(0);
    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/api::article.article/${id}/actions/publish`,
    });

    expect(res.statusCode).toBe(403);
  });

  test('User can delete cheap articles', async () => {
    const { id } = localTestData.cheapArticle;
    const rq = getUserRequest(0);
    const res = await rq({
      method: 'DELETE',
      url: `/content-manager/collection-types/api::article.article/${id}`,
    });

    expect(res.statusCode).toBe(200);
  });

  test('User cannot delete expensive articles', async () => {
    const { id } = localTestData.expensiveArticle;
    const rq = getUserRequest(0);
    const res = await rq({
      method: 'DELETE',
      url: `/content-manager/collection-types/api::article.article/${id}`,
    });

    expect(res.statusCode).toBe(403);
  });
});
