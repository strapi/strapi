'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const ct = {
  displayName: 'withrichtext',
  singularName: 'withrichtext',
  pluralName: 'withrichtexts',
  attributes: {
    field: {
      type: 'richtext',
    },
  },
};

describe('Test type richtext', () => {
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
    const res = await rq.post('/content-manager/collection-types/api::withrichtext.withrichtext', {
      body: {
        field: 'Some\ntext',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: 'Some\ntext',
    });
  });

  test('Reading entry, returns correct value', async () => {
    const res = await rq.get('/content-manager/collection-types/api::withrichtext.withrichtext');

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(Array.isArray(res.body.results)).toBe(true);
    res.body.results.forEach((entry) => {
      expect(entry.field).toEqual(expect.any(String));
    });
  });

  test('Updating entry with JSON sets the right value and format', async () => {
    const res = await rq.post('/content-manager/collection-types/api::withrichtext.withrichtext', {
      body: { field: 'Some \ntext' },
    });

    const updateRes = await rq.put(
      `/content-manager/collection-types/api::withrichtext.withrichtext/${res.body.id}`,
      {
        body: { field: 'Updated \nstring' },
      }
    );
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body).toMatchObject({
      id: res.body.id,
      field: 'Updated \nstring',
    });
  });
});
