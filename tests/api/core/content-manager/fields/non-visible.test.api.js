/**
 * This test will use non visible fields and validate they can be filtered and sorted by
 */

'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const { createUtils } = require('api-tests/utils');

const builder = createTestBuilder();

const ct = {
  displayName: 'nonvisible',
  singularName: 'nonvisible',
  pluralName: 'nonvisibles',
  attributes: {
    field: {
      type: 'string',
      visible: false,
      writable: true,
    },
    name: {
      type: 'string',
    },
  },
};

let rq1;
let rq2;
let user1;
let user2;
let strapi;
let utils;

const createEntry = async (data) => {
  return strapi.db.query('api::nonvisible.nonvisible').create({
    data,
  });
};

/**
 * == Test Suite Overview ==
 *
 * N°   Description
 * -------------------------------------------
 * 1.  Filters by non visible field (successfully)
 * 2.  Filters by created_by (successfully)
 * 3.  Filters by updated_by (successfully)
 */

// TODO: Fix document service validations
describe.skip('Test non visible fields', () => {
  beforeAll(async () => {
    await builder.addContentType(ct).build();

    strapi = await createStrapiInstance();
    utils = createUtils(strapi);

    const userInfo = {
      email: 'test@strapi.io',
      firstname: 'test',
      lastname: 'strapi',
      registrationToken: 'foobar',
      roles: [await utils.getSuperAdminRole()],
    };

    user1 = await utils.createUser(userInfo);
    user2 = await utils.createUser({ ...userInfo, email: 'test2@strapi.io' });

    rq1 = await createAuthRequest({ strapi, userInfo: user1 });
    rq2 = await createAuthRequest({ strapi, userInfo: user2 });

    await createEntry({ field: 'entry1', createdBy: user1.id, updatedBy: user1.id });
    await createEntry({ field: 'entry2', createdBy: user2.id, updatedBy: user2.id });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('User can filter by non visible and writable fields ', async () => {
    const res = await rq1.get(
      `/content-manager/collection-types/api::nonvisible.nonvisible?filters[field][$eq]=entry1`
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.results.length).toBe(1);
    expect(res.body.results[0].field).toBe('entry1');
  });

  test('User can filter by createdBy field ', async () => {
    const res = await rq1.get(
      `/content-manager/collection-types/api::nonvisible.nonvisible?filters[createdBy][id][$eq]=${user1.id}`
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.results.length).toBe(1);
    expect(res.body.results[0].createdBy.id).toBe(user1.id);
  });

  test('User can filter by updatedBy field ', async () => {
    const res = await rq1.get(
      `/content-manager/collection-types/api::nonvisible.nonvisible?filters[updatedBy][id][$eq]=${user1.id}`
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.results.length).toBe(1);
    expect(res.body.results[0].updatedBy.id).toBe(user1.id);
  });
});
