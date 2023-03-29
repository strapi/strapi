'use strict';

// Helpers.
const { createTestBuilder } = require('../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../test/helpers/request');
const { createUtils } = require('../../../../../test/helpers/utils');

const { ALLOWED_SORT_STRINGS } = require('../../server/constants');

const builder = createTestBuilder();
let strapi;
let utils;

const requests = {
  admin: null,
  restricted: null,
};

const dogModel = {
  displayName: 'Dog',
  singularName: 'dog',
  pluralName: 'dogs',
  kind: 'collectionType',
  attributes: {
    profilePicture: {
      type: 'media',
    },
  },
};

const localData = {
  restrictedUser: null,
  restrictedRole: null,
};

const restrictedUser = {
  email: 'restricted@user.io',
  password: 'Restricted123',
};

const restrictedRole = {
  name: 'restricted-role',
  description: '',
};

const createFixtures = async () => {
  const role = await utils.createRole(restrictedRole);
  const user = await utils.createUserIfNotExists({
    ...restrictedUser,
    roles: [role.id],
  });

  localData.restrictedUser = user;
  localData.restrictedRole = role;

  return { role, user };
};

const deleteFixtures = async () => {
  await utils.deleteUserById(localData.restrictedUser.id);
  await utils.deleteRolesById([localData.restrictedRole.id]);
};

const endPoint = '/upload/configuration';

describe('Configure Media Library View', () => {
  beforeAll(async () => {
    await builder.addContentType(dogModel).build();

    strapi = await createStrapiInstance();
    utils = createUtils(strapi);

    await createFixtures();

    requests.admin = await createAuthRequest({ strapi });
    requests.restricted = await createAuthRequest({ strapi, userInfo: restrictedUser });
  });

  afterAll(async () => {
    await deleteFixtures();

    await strapi.destroy();
    await builder.cleanup();
  });

  describe('GET /upload/configuration => Gets the ML view configuration', () => {
    test('Returns the view configuration', async () => {
      const res = await requests.admin({ method: 'GET', url: endPoint });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          pageSize: 10,
          sort: ALLOWED_SORT_STRINGS[0],
        },
      });
    });
  });

  describe('PUT /upload/configuration/', () => {
    test('403 response when updating the ML view configuration', async () => {
      const updateRes = await requests.restricted({
        method: 'PUT',
        url: endPoint,
        body: {
          pageSize: 100,
        },
      });

      expect(updateRes.statusCode).toBe(403);
    });

    test('Fails to update the ML view configuration with an invalid sort string', async () => {
      const config = {
        pageSize: 100,
        sort: 'not_accepted',
      };
      const updateRes = await requests.admin({
        method: 'PUT',
        url: endPoint,
        body: config,
      });

      expect(updateRes.statusCode).toBe(400);
    });

    test('Successfully update the ML view configuration', async () => {
      const config = {
        pageSize: 100,
        sort: ALLOWED_SORT_STRINGS[1],
      };
      const updateRes = await requests.admin({
        method: 'PUT',
        url: endPoint,
        body: config,
      });

      const expectedRes = {
        data: config,
      };

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body).toEqual(expectedRes);

      const getRes = await requests.admin({ method: 'GET', url: endPoint });

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toEqual(expectedRes);
    });
  });
});
