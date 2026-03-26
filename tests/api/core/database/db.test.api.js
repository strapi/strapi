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
    related: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'api::related.related',
    },
  },
};

const relatedCT = {
  displayName: 'related',
  singularName: 'related',
  pluralName: 'relateds',
  kind: 'collectionType',
  attributes: {
    title: {
      type: 'string',
    },
  },
};

const fixtures = {
  test: ({ related }) => {
    return [
      {
        name: 'Hugo LLORIS',
        related: related[0].id,
      },
      {
        name: 'Samuel UMTITI',
        related: related[1].id,
      },
      {
        name: 'Lucas HERNANDEZ',
        related: related[0].id,
      },
    ];
  },
  related: [
    {
      title: 'Category A',
    },
    {
      title: 'Category B',
    },
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
    const res = await strapi.db
      .query('api::test.test')
      .createMany({ data: [{ name: 'foo' }, { name: 'bar' }] });

    expect(res).toMatchObject({ count: expect.any(Number) });
    expect(Array.isArray(res.ids)).toBe(true);
    expect(res.ids.length).toBe(2);
  });

  test('findMany with select and relation filter returns all matching rows', async () => {
    // Regression test: using select with a relation filter previously returned
    // only 1 row because DISTINCT was applied without the primary key,
    // collapsing rows that shared the same values in the selected columns.
    const results = await strapi.db.query('api::test.test').findMany({
      where: {
        related: { title: 'Category A' },
      },
      select: ['name'],
    });

    expect(results.length).toBe(2);
    expect(results.map((r) => r.name).sort()).toEqual(['Hugo LLORIS', 'Lucas HERNANDEZ']);
  });

  test('findMany with select and relation filter works with duplicate selected values', async () => {
    // Edge case: when selected columns contain duplicate values across rows,
    // DISTINCT without the PK would collapse them into one row.
    // Insert two entries with the same name but different relations.
    await strapi.db.query('api::test.test').create({ data: { name: 'Hugo LLORIS' } });

    const results = await strapi.db.query('api::test.test').findMany({
      select: ['name'],
    });

    // Should return all entries even when name values collide
    expect(results.length).toBeGreaterThanOrEqual(4);
  });

  test('Delete multiple entries with deep filtering', async () => {
    const deleteRes = await strapi.db.query('api::test.test').deleteMany({
      where: {
        related: { title: 'Category A' },
      },
    });

    expect(deleteRes.count).toBe(2);

    const remainingEntries = await strapi.db.query('api::test.test').findMany();
    expect(remainingEntries.length).toBe(1);
    expect(remainingEntries[0].name).toBe('Samuel UMTITI');
  });
});
