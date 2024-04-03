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

describeOnCondition(edition === 'EE')('SSO Provider Options', () => {
  let hasSSO;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    utils = createUtils(strapi);
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

  describe('Get provider options', () => {
    test('Get the provider options as public user gives 401', async () => {
      const res = await requests.public.get('/admin/providers/options');
      expect(res.status).toEqual(401);
    });

    test('Get the provider options with no permissions gives 403', async () => {
      const res = await requests.noPermissions.get('/admin/providers/options');
      expect(res.status).toEqual(403);
    });

    test('Get the provider options as admin succeeds', async () => {
      const res = await requests.admin.get('/admin/providers/options');
      if (hasSSO) {
        expect(res.status).toBe(200);
        const { data } = JSON.parse(res.text);
        const keys = Object.keys(data);
        expect(keys).toContain('autoRegister');
        expect(keys).toContain('ssoLockedRoles');
        expect(keys).toContain('defaultRole');
      } else {
        expect(res.status).toBe(404);
        expect(Array.isArray(res.body)).toBeFalsy();
      }
    });
  });

  describe('ssoLockedRoles', () => {
    test.each([
      ['empty array', []],
      ['null', null],
      ['array of roles', [1]],
    ])('can be %s', async (name, value) => {
      const newData = {
        ssoLockedRoles: value,
        defaultRole: null,
        autoRegister: false,
      };
      const res = await requests.admin.put('/admin/providers/options', {
        body: newData,
      });
      if (hasSSO) {
        expect(res.status).toEqual(200);
        const parsed = JSON.parse(res.text);
        expect(parsed.data).toMatchObject(newData);
      } else {
        expect(res.status).toBe(404);
        expect(Array.isArray(res.body)).toBeFalsy();
      }
    });

    test.each([
      ['invalid role id', [999]],
      ['string', '1'],
      ['object', { role: 1 }],
    ])('cannot be %s', async (name, value) => {
      const res = await requests.admin.put('/admin/providers/options', {
        body: {
          ssoLockedRoles: value,
          defaultRole: null,
          autoRegister: false,
        },
      });
      if (hasSSO) {
        expect(res.status).toEqual(400);
      } else {
        expect(res.status).toBe(404);
        expect(Array.isArray(res.body)).toBeFalsy();
      }
    });

    describe('autoRegister and defaultRole', () => {
      test.each([
        [null, false],
        [1, false],
        [1, true],
      ])('defaultRole can be %s when autoRegister is %s', async (defaultRole, autoRegister) => {
        const newData = {
          defaultRole,
          autoRegister,
        };
        const res = await requests.admin.put('/admin/providers/options', {
          body: newData,
        });
        if (hasSSO) {
          expect(res.status).toEqual(200);
          const parsed = JSON.parse(res.text);
          expect(parsed.data).toMatchObject(newData);
        } else {
          expect(res.status).toBe(404);
          expect(Array.isArray(res.body)).toBeFalsy();
        }
      });

      test.each([
        [null, true],
        [{}, true],
        [9999, true],
      ])('defaultRole cannot be %s when autoRegister is %s', async (defaultRole, autoRegister) => {
        const newData = {
          defaultRole,
          autoRegister,
        };
        const res = await requests.admin.put('/admin/providers/options', {
          body: newData,
        });
        if (hasSSO) {
          expect(res.status).toEqual(400);
        } else {
          expect(res.status).toBe(404);
          expect(Array.isArray(res.body)).toBeFalsy();
        }
      });
    });
  });
});
