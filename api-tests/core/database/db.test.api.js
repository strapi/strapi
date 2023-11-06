'use strict';

// Test an API with all the possible filed types and simple filterings (no deep filtering, no relations)
const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');

const builder = createTestBuilder();
let strapi;

const testCT = {
  displayName: 'test',
  singularName: 'test',
  pluralName: 'tests',
  kind: 'collectionType',
  attributes: {
    name: {
      type: 'string',
    },
  },
};

const fixtures = {
  test: [
    {
      name: 'Hugo LLORIS',
    },
    {
      name: 'Samuel UMTITI',
    },
    {
      name: 'Lucas HERNANDEZ',
    },
  ],
};

describe('Deep Filtering API', () => {
  beforeAll(async () => {
    await builder.addContentType(testCT).build();

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Return an array of ids on createMany', async () => {
    const res = await strapi.db.query('api::test.test').createMany({ data: fixtures.test });

    expect(res).toMatchObject({ count: expect.any(Number) });
    expect(Array.isArray(res.ids)).toBe(true);
    expect(res.ids.length > 0).toBe(true);
  });
});
