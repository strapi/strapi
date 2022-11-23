'use strict';

const { createTestBuilder } = require('../../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../../test/helpers/request');

const builder = createTestBuilder();
let strapi;
let rq;

const ct = {
  displayName: 'withdecimal',
  singularName: 'withdecimal',
  pluralName: 'withdecimals',
  attributes: {
    field: {
      type: 'decimal',
    },
  },
};

describe('Test type decimal', () => {
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
    const inputValue = 12.31;
    const res = await rq.post('/content-manager/collection-types/api::withdecimal.withdecimal', {
      body: {
        field: inputValue,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: inputValue,
    });
  });

  test('Create entry with integer should convert to decimal', async () => {
    const inputValue = 1821;
    const res = await rq.post('/content-manager/collection-types/api::withdecimal.withdecimal', {
      body: {
        field: inputValue,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: 1821.0,
    });
  });

  test('Reading entry, returns correct value', async () => {
    const res = await rq.get('/content-manager/collection-types/api::withdecimal.withdecimal');

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(Array.isArray(res.body.results)).toBe(true);
    res.body.results.forEach((entry) => {
      expect(entry.field).toEqual(expect.any(Number));
    });
  });

  test('Updating entry sets the right value and format', async () => {
    const res = await rq.post('/content-manager/collection-types/api::withdecimal.withdecimal', {
      body: {
        field: 11.2,
      },
    });

    const updateRes = await rq.put(
      `/content-manager/collection-types/api::withdecimal.withdecimal/${res.body.id}`,
      {
        body: {
          field: 14,
        },
      }
    );

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body).toMatchObject({
      id: res.body.id,
      field: 14.0,
    });
  });
});
