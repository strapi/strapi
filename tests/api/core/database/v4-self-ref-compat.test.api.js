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
    children: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::test.test',
      inversedBy: 'parents',
    },
    parents: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::test.test',
      inversedBy: 'children', // intentionally wrong to validate retro compatibility
    },
  },
};

describe('v4-self-ref-compat', () => {
  beforeAll(async () => {
    await builder.addContentType(testCT).build();

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('2 tables are created', async () => {
    const hasFirstTable = await strapi.db.getConnection().schema.hasTable('tests_children_lnk');
    const hasSecondTable = await strapi.db.getConnection().schema.hasTable('tests_parents_lnk');

    expect(hasFirstTable).toBe(true);
    expect(hasSecondTable).toBe(true);
  });
});
