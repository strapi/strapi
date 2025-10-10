'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const ct = {
  displayName: 'withstring',
  singularName: 'withstring',
  pluralName: 'withstrings',
  attributes: {
    field: {
      type: 'string',
    },
  },
};

describe('Test type string', () => {
  beforeAll(async () => {
    await builder.addContentType(ct).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Creates an entry with JSON', async () => {
    const res = await rq.post('/content-manager/collection-types/api::withstring.withstring', {
      body: {
        field: 'Some string',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject({
      field: 'Some string',
    });
  });

  test('Reading entry, returns correct value', async () => {
    const res = await rq.get('/content-manager/collection-types/api::withstring.withstring');

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(Array.isArray(res.body.results)).toBe(true);
    res.body.results.forEach((entry) => {
      expect(entry.field).toEqual(expect.any(String));
    });
  });

  test('Updating entry with JSON sets the right value and format', async () => {
    const res = await rq.post('/content-manager/collection-types/api::withstring.withstring', {
      body: { field: 'Some string' },
    });

    const updateRes = await rq.put(
      `/content-manager/collection-types/api::withstring.withstring/${res.body.data.documentId}`,
      {
        body: { field: 'Updated string' },
      }
    );
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data).toMatchObject({
      documentId: res.body.data.documentId,
      field: 'Updated string',
    });
  });
});
