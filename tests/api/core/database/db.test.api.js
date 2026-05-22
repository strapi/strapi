'use strict';

// Test deep filtering (nested relation filters) for find/create/update/delete via the Query Engine.
// Covers the exact scenario from GitHub #11998: deleteMany / updateMany with { related: { title/id } } filters.
const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');

const builder = createTestBuilder();
let strapi;

const relatedCT = {
  displayName: 'related',
  singularName: 'related',
  pluralName: 'relateds',
  kind: 'collectionType',
  attributes: {
    title: { type: 'string' },
  },
};

const testCT = {
  displayName: 'test',
  singularName: 'test',
  pluralName: 'tests',
  kind: 'collectionType',
  attributes: {
    name: {
      type: 'string',
    },
    related: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'api::related.related',
    },
  },
};

const fixtures = {
  related: [
    { title: 'Category A' },
    { title: 'Category B' },
  ],
  test: ({ related }) => [
    { name: 'Hugo LLORIS', related: related[0].id },
    { name: 'Samuel UMTITI', related: related[1].id },
    { name: 'Lucas HERNANDEZ', related: related[0].id },
  ],
};

describe('Deep Filtering API', () => {
  beforeEach(async () => {
    await builder
      .addContentTypes([relatedCT, testCT])
      .addFixtures(relatedCT.singularName, fixtures.related)
      .addFixtures(testCT.singularName, fixtures.test)
      .build();

    strapi = await createStrapiInstance();
  });

  afterEach(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Return an array of ids on createMany', async () => {
    // Adapted for relation: create using an existing related from the seeded fixtures
    const relateds = await strapi.db.query('api::related.related').findMany();
    const relatedId = relateds[0].id;

    const res = await strapi.db.query('api::test.test').createMany({
      data: [
        { name: 'CreateMany Test 1', related: relatedId },
        { name: 'CreateMany Test 2', related: relatedId },
      ],
    });

    expect(res).toMatchObject({ count: expect.any(Number) });
    expect(Array.isArray(res.ids)).toBe(true);
    expect(res.ids.length).toBe(2);
  });

  test('findMany with nested filter succeeds (sanity)', async () => {
    const res = await strapi.db.query('api::test.test').findMany({
      where: { related: { title: 'Category A' } },
    });
    expect(res.length).toBe(2);
  });

  test('deleteMany with nested filter succeeds', async () => {
    // This is the exact reproduction case from #11998 (was throwing SQL error on v4 before the backport)
    const deleteRes = await strapi.db.query('api::test.test').deleteMany({
      where: { related: { title: 'Category A' } },
    });
    expect(deleteRes).toMatchObject({ count: 2 });
  });

  test('updateMany with nested filter succeeds', async () => {
    // Exercises the symmetric fix applied to updateMany in entity-manager
    const updateRes = await strapi.db.query('api::test.test').updateMany({
      where: { related: { title: 'Category B' } },
      data: { name: 'Updated via updateMany' },
    });
    expect(updateRes).toMatchObject({ count: 1 });

    // Verify the data was actually updated
    const updated = await strapi.db.query('api::test.test').findMany({
      where: { name: 'Updated via updateMany' },
    });
    expect(updated.length).toBe(1);
  });
});
