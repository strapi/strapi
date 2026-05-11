'use strict';

// `strapi.db.query` behaviour: createMany batching, deep filters, deleteMany (incl. relation + filters parity).
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

  /**
   * createMany with 550 items (GH#25198): on SQLite, batching keeps each insert batch ≤500.
   */
  test('createMany with 550 items succeeds on all databases (batched insert)', async () => {
    const count = 550;
    const data = Array.from({ length: count }, (_, i) => ({ name: `item-${i}` }));
    const res = await strapi.db.query('api::test.test').createMany({ data });

    expect(res.count).toBe(count);
    expect(Array.isArray(res.ids)).toBe(true);
    expect(res.ids.length).toBe(count);
  }, 120000);

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

  // deleteMany must merge `filters` like `count` / `findMany` (GH#11998, PR #25420 / #25590).
  test('deleteMany respects filters combined with relation where (same param shape as count)', async () => {
    const uid = 'api::test.test';
    const params = {
      where: { related: { title: 'Category A' } },
      filters: { name: 'Hugo LLORIS' },
    };

    expect(await strapi.db.query(uid).count(params)).toBe(1);

    await strapi.db.query(uid).deleteMany(params);

    const remaining = await strapi.db.query(uid).findMany();
    expect(remaining).toHaveLength(2);
    expect(remaining.map((e) => e.name).sort()).toEqual(['Lucas HERNANDEZ', 'Samuel UMTITI']);
  });
});
