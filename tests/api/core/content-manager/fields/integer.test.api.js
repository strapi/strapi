'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const ct = {
  displayName: 'withinteger',
  singularName: 'withinteger',
  pluralName: 'withintegers',
  attributes: {
    field: {
      type: 'integer',
    },
  },
};

describe('Test type integer', () => {
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
    const res = await rq.post('/content-manager/collection-types/api::withinteger.withinteger', {
      body: {
        field: 123456,
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject({
      field: 123456,
    });
  });

  // I don't think it will work everywhere ...
  test('Create entry with a string should cast the value', async () => {
    const res = await rq.post('/content-manager/collection-types/api::withinteger.withinteger', {
      body: {
        field: '123456',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject({
      field: 123456,
    });
  });

  test('Reading entry, returns correct value', async () => {
    const res = await rq.get('/content-manager/collection-types/api::withinteger.withinteger');

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(Array.isArray(res.body.results)).toBe(true);
    res.body.results.forEach((entry) => {
      expect(Number.isInteger(entry.field)).toBe(true);
    });
  });

  test('Updating entry sets the right value and format', async () => {
    const res = await rq.post('/content-manager/collection-types/api::withinteger.withinteger', {
      body: {
        field: 123,
      },
    });

    const updatedRes = await rq.put(
      `/content-manager/collection-types/api::withinteger.withinteger/${res.body.data.documentId}`,
      {
        body: {
          field: 543,
        },
      }
    );

    expect(updatedRes.statusCode).toBe(200);
    expect(updatedRes.body.data).toMatchObject({
      documentId: res.body.data.documentId,
      field: 543,
    });
  });

  test('Clearing the value should set it to null', async () => {
    const res = await rq.post('/content-manager/collection-types/api::withinteger.withinteger', {
      body: {
        field: 123,
      },
    });

    const updatedRes = await rq.put(
      `/content-manager/collection-types/api::withinteger.withinteger/${res.body.data.documentId}`,
      {
        body: {
          field: null,
        },
      }
    );

    expect(updatedRes.statusCode).toBe(200);
    expect(updatedRes.body.data).toMatchObject({
      documentId: res.body.data.documentId,
      field: null,
    });
  });
});
