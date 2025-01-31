'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const ct = {
  displayName: 'withenumeration',
  singularName: 'withenumeration',
  pluralName: 'withenumerations',
  attributes: {
    field: {
      type: 'enumeration',
      enum: ['one', 'two'],
    },
  },
};

describe('Test type enumeration', () => {
  beforeAll(async () => {
    await builder.addContentType(ct).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Create entry value enumeration input JSON', async () => {
    const res = await rq.post(
      '/content-manager/collection-types/api::withenumeration.withenumeration',
      {
        body: {
          field: 'one',
        },
      }
    );

    expect(res.statusCode).toBe(200); // should return 201
    expect(res.body).toMatchObject({
      field: 'one',
    });
  });

  test('Reading entry, returns correct value', async () => {
    const res = await rq.get(
      '/content-manager/collection-types/api::withenumeration.withenumeration'
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(Array.isArray(res.body.results)).toBe(true);
    res.body.results.forEach((entry) => {
      expect(['one', 'two'].includes(entry.field)).toBe(true);
    });
  });

  test('Updating entry sets the right value and format', async () => {
    const res = await rq.post(
      '/content-manager/collection-types/api::withenumeration.withenumeration',
      {
        body: {
          field: 'two',
        },
      }
    );

    const updateRes = await rq.put(
      `/content-manager/collection-types/api::withenumeration.withenumeration/${res.body.id}`,
      {
        body: {
          field: 'one',
        },
      }
    );

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body).toMatchObject({
      id: res.body.id,
      field: 'one',
    });
  });

  test('Allows null value', async () => {
    const res = await rq.post(
      '/content-manager/collection-types/api::withenumeration.withenumeration',
      {
        body: {
          field: null,
        },
      }
    );

    expect(res.statusCode).toBe(200); // should return 201
    expect(res.body).toMatchObject({
      field: null,
    });
  });

  test('Throws an error when the enumeration value is not in the options', async () => {
    const res = await rq.post(
      '/content-manager/collection-types/api::withenumeration.withenumeration',
      {
        body: {
          field: 'invalid-value',
        },
      }
    );

    expect(res.statusCode).toBe(400);
  });
});
