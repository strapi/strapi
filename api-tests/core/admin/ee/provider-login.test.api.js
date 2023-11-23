'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest, createRequest } = require('api-tests/request');
const { createUtils, describeOnCondition } = require('api-tests/utils');

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

let strapi;
let utils;
const requests = {
  public: undefined,
  admin: undefined,
  noPermissions: undefined,
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

describeOnCondition(edition === 'EE')('Provider Login', () => {
  let hasSSO;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    utils = createUtils(strapi);
    // eslint-disable-next-line node/no-extraneous-require
    hasSSO = strapi.ee.features.isEnabled('sso');

    await createFixtures();

    requests.public = createRequest({ strapi });
    requests.admin = await createAuthRequest({ strapi });
    requests.noPermissions = await createAuthRequest({ strapi, userInfo: restrictedUser });
  });

  afterAll(async () => {
    await deleteFixtures();
    await strapi.destroy();
  });

  describe('Get the provider list', () => {
    test.each(Object.keys(requests))('It should be available for everyone (%s)', async (type) => {
      const rq = requests[type];
      const res = await rq.get('/admin/providers');

      if (hasSSO) {
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBeTruthy();
        expect(res.body).toHaveLength(0);
      } else {
        expect(res.status).toBe(404);
        expect(Array.isArray(res.body)).toBeFalsy();
      }
    });
  });

  describe('Read the provider login options', () => {
    test('It should fail with a public request', async () => {
      const res = await requests.public.get('/admin/providers/options');

      expect(res.status).toBe(hasSSO ? 401 : 404);
    });

    test('It should fail with an authenticated request (restricted user)', async () => {
      const res = await requests.noPermissions.get('/admin/providers/options');

      expect(res.status).toBe(hasSSO ? 403 : 404);
    });

    test('It should succeed with an authenticated request (admin)', async () => {
      const res = await requests.admin.get('/admin/providers/options');

      if (hasSSO) {
        expect(res.status).toBe(200);
        expect(res.body.data).toBeDefined();
        expect(typeof res.body.data.autoRegister).toBe('boolean');
        expect(res.body.data.defaultRole).toBeDefined();
      } else {
        expect(res.status).toBe(404);
      }
    });
  });

  describe('Update the provider login options', () => {
    let newOptions;

    beforeAll(async () => {
      const superAdminRole = await utils.getSuperAdminRole();

      newOptions = {
        defaultRole: superAdminRole.id,
        autoRegister: false,
      };
    });

    test('It should fail with a public request', async () => {
      const res = await requests.public.put('/admin/providers/options', { body: newOptions });

      expect(res.status).toBe(hasSSO ? 401 : 405);
    });

    test('It should fail with an authenticated request (restricted user)', async () => {
      const res = await requests.noPermissions.put('/admin/providers/options', {
        body: newOptions,
      });

      expect(res.status).toBe(hasSSO ? 403 : 405);
    });

    test('It should succeed with an authenticated request (admin)', async () => {
      const res = await requests.admin.put('/admin/providers/options', { body: newOptions });

      if (hasSSO) {
        expect(res.status).toBe(200);
        expect(res.body.data).toBeDefined();
        expect(res.body.data).toMatchObject(newOptions);
      } else {
        expect(res.status).toBe(405);
      }
    });

    test('It should fail with an invalid payload', async () => {
      const res = await requests.admin.put('/admin/providers/options', {
        body: { ...newOptions, autoRegister: 'foobar' },
      });

      expect(res.status).toBe(hasSSO ? 400 : 405);
    });
  });
});
