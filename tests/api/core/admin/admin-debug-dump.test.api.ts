'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const { createUtils } = require('api-tests/utils');

const builder = createTestBuilder();
let strapi;
let utils;
let rq; // super admin
let restrictedRq; // user WITHOUT admin::debug-dump.read

const restrictedRole = {
  name: 'no-debug-dump',
  description: 'Role without admin::debug-dump.read for the gate test',
};
const restrictedUser = {
  firstname: 'No',
  lastname: 'Debug',
  email: 'no.debug@test.com',
  password: 'Test1234',
};

describe('Admin | debug-dump', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    utils = createUtils(strapi);
    rq = await createAuthRequest({ strapi });

    // A super admin already exists (seeded on bootstrap), so createUser does NOT
    // auto-add the super-admin role: this user gets ONLY the permission-less role.
    const role = await utils.createRole(restrictedRole);
    restrictedRole.id = role.id;
    const user = await utils.createUser({ ...restrictedUser, roles: [role.id] });
    restrictedUser.id = user.id;
    restrictedRq = await createAuthRequest({ strapi, userInfo: user });
  });

  afterAll(async () => {
    await utils.deleteUsersById([restrictedUser.id]);
    await utils.deleteRolesById([restrictedRole.id]);
    await strapi.destroy();
    await builder.cleanup();
  });

  test('a super admin can generate a debug dump', async () => {
    const res = await rq({ method: 'GET', url: '/admin/debug-dump' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.dumpVersion).toBe(1);
  });

  test('a user without admin::debug-dump.read is forbidden', async () => {
    const res = await restrictedRq({ method: 'GET', url: '/admin/debug-dump' });
    expect(res.statusCode).toBe(403);
  });
});
