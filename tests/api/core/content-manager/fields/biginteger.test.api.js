'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const ct = {
  displayName: 'withbiginteger',
  singularName: 'withbiginteger',
  pluralName: 'withbigintegers',
  attributes: {
    field: {
      type: 'biginteger',
    },
  },
};

describe('Test type biginteger', () => {
  beforeAll(async () => {
    await builder.addContentType(ct).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Create entry with value input JSON', async () => {
    const inputValue = '1223372036854775';
    const res = await rq.post(
      '/content-manager/collection-types/api::withbiginteger.withbiginteger',
      {
        body: {
          field: inputValue,
        },
      }
    );

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject({
      field: inputValue,
    });
  });

  test('Create entry with integer should return a string', async () => {
    const inputValue = 1821;
    const res = await rq.post(
      '/content-manager/collection-types/api::withbiginteger.withbiginteger',
      {
        body: {
          field: inputValue,
        },
      }
    );

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject({
      field: `${inputValue}`,
    });
  });

  test('Reading entry, returns correct value', async () => {
    const res = await rq.get(
      '/content-manager/collection-types/api::withbiginteger.withbiginteger'
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(Array.isArray(res.body.results)).toBe(true);
    res.body.results.forEach((entry) => {
      expect(entry.field).toEqual(expect.any(String));
    });
  });

  test('Updating entry sets the right value and format', async () => {
    const inputValue = '1223372036854775';
    const res = await rq.post(
      '/content-manager/collection-types/api::withbiginteger.withbiginteger',
      {
        body: {
          field: inputValue,
        },
      }
    );

    const newVal = '9882823782712112';
    const updateRes = await rq.put(
      `/content-manager/collection-types/api::withbiginteger.withbiginteger/${res.body.data.documentId}`,
      {
        body: {
          field: newVal,
        },
      }
    );

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data).toMatchObject({
      documentId: res.body.data.documentId,
      field: newVal,
    });
  });
});
