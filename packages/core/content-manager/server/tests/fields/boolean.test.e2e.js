'use strict';

const { createTestBuilder } = require('../../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../../test/helpers/request');

const builder = createTestBuilder();
let strapi;
let rq;

const ct = {
  displayName: 'withboolean',
  singularName: 'withboolean',
  pluralName: 'withbooleans',
  attributes: {
    field: {
      type: 'boolean',
    },
  },
};

describe('Test type boolean', () => {
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
    const res = await rq.post('/content-manager/collection-types/api::withboolean.withboolean', {
      body: {
        field: true,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: true,
    });
  });

  test('Throws on invalid boolean value', async () => {
    const res = await rq.post('/content-manager/collection-types/api::withboolean.withboolean', {
      body: { field: 'random' },
    });

    expect(res.statusCode).toBe(400);
  });

  test('Convert integer to boolean value', async () => {
    let res = await rq.post('/content-manager/collection-types/api::withboolean.withboolean', {
      body: { field: 1 },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: true,
    });

    res = await rq.post('/content-manager/collection-types/api::withboolean.withboolean', {
      body: { field: 0 },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: false,
    });
  });

  test('Reading entry, returns correct value', async () => {
    const res = await rq.get('/content-manager/collection-types/api::withboolean.withboolean');

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(Array.isArray(res.body.results)).toBe(true);
    res.body.results.forEach((entry) => {
      expect(entry.field).toEqual(expect.any(Boolean));
    });
  });

  test('Updating entry sets the right value and format', async () => {
    const res = await rq.post('/content-manager/collection-types/api::withboolean.withboolean', {
      body: {
        field: true,
      },
    });

    const updateRes = await rq.put(
      `/content-manager/collection-types/api::withboolean.withboolean/${res.body.id}`,
      {
        body: {
          field: false,
        },
      }
    );

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body).toMatchObject({
      id: res.body.id,
      field: false,
    });
  });
});
