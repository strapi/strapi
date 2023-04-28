'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { isKnexQuery } = require('../../../packages/core/database/lib/utils/knex');

let strapi;

describe('knex', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  describe('isKnexQuery', () => {
    test('knex query: true', () => {
      const res = isKnexQuery(strapi.db.connection('strapi_core_store_settings'));
      expect(res).toBe(true);
    });

    test('knex raw: true', () => {
      const res = isKnexQuery(strapi.db.connection.raw('SELECT * FROM strapi_core_store_settings'));
      expect(res).toBe(true);
    });

    test.each([[''], [{}], [[]], [2], [new Date()]])('%s: false', (value) => {
      const res = isKnexQuery(value);
      expect(res).toBe(false);
    });
  });
});
