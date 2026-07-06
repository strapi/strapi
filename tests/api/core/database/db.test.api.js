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

const TEST_UID = 'api::test.test';
const RELATED_UID = 'api::related.related';

/** Fixture rows: Hugo + Lucas → Category A; Samuel → Category B */
const ALL_ENTRY_NAMES = ['Hugo LLORIS', 'Lucas HERNANDEZ', 'Samuel UMTITI'];
const ALL_RELATED_TITLES = ['Category A', 'Category B'];

/**
 * deleteMany filter matrix (GH#11998, PR #25420).
 * Each case asserts count/deleteMany parity and the surviving row names.
 */
const deleteManyFilterCases = [
  // --- where only ---
  {
    label: 'where: scalar field',
    params: { where: { name: 'Hugo LLORIS' } },
    deletedCount: 1,
    remaining: ['Lucas HERNANDEZ', 'Samuel UMTITI'],
  },
  {
    label: 'where: nested relation',
    params: { where: { related: { title: 'Category A' } } },
    deletedCount: 2,
    remaining: ['Samuel UMTITI'],
  },
  {
    label: 'where: nested relation (other side)',
    params: { where: { related: { title: 'Category B' } } },
    deletedCount: 1,
    remaining: ['Hugo LLORIS', 'Lucas HERNANDEZ'],
  },
  {
    label: 'where: $or across scalars',
    params: { where: { $or: [{ name: 'Hugo LLORIS' }, { name: 'Samuel UMTITI' }] } },
    deletedCount: 2,
    remaining: ['Lucas HERNANDEZ'],
  },
  {
    label: 'where: no matches',
    params: { where: { name: 'Nobody' } },
    deletedCount: 0,
    remaining: ALL_ENTRY_NAMES,
  },
  // --- filters only (same engine as where, separate param key) ---
  {
    label: 'filters: scalar field',
    params: { filters: { name: 'Samuel UMTITI' } },
    deletedCount: 1,
    remaining: ['Hugo LLORIS', 'Lucas HERNANDEZ'],
  },
  {
    label: 'filters: nested relation',
    params: { filters: { related: { title: 'Category A' } } },
    deletedCount: 2,
    remaining: ['Samuel UMTITI'],
  },
  // --- where + filters (AND) ---
  {
    label: 'where + filters: relation where, scalar filters',
    params: {
      where: { related: { title: 'Category A' } },
      filters: { name: 'Hugo LLORIS' },
    },
    deletedCount: 1,
    remaining: ['Lucas HERNANDEZ', 'Samuel UMTITI'],
  },
  {
    label: 'where + filters: scalar where, relation filters',
    params: {
      where: { name: 'Lucas HERNANDEZ' },
      filters: { related: { title: 'Category A' } },
    },
    deletedCount: 1,
    remaining: ['Hugo LLORIS', 'Samuel UMTITI'],
  },
  {
    label: 'where + filters: both scalar (intersection)',
    params: {
      where: { name: { $containsi: 'loris' } },
      filters: { name: { $containsi: 'hugo' } },
    },
    deletedCount: 1,
    remaining: ['Lucas HERNANDEZ', 'Samuel UMTITI'],
  },
  {
    label: 'where + filters: contradictory (no rows)',
    params: {
      where: { name: 'Samuel UMTITI' },
      filters: { related: { title: 'Category A' } },
    },
    deletedCount: 0,
    remaining: ALL_ENTRY_NAMES,
  },
  // --- _q (root-entity text search; does not search relations) ---
  {
    label: '_q: single name match (UMTITI)',
    params: { _q: 'UMTITI' },
    deletedCount: 1,
    remaining: ['Hugo LLORIS', 'Lucas HERNANDEZ'],
  },
  {
    label: '_q: single name match (HERNANDEZ)',
    params: { _q: 'HERNANDEZ' },
    deletedCount: 1,
    remaining: ['Hugo LLORIS', 'Samuel UMTITI'],
  },
  {
    label: '_q: no match on root fields',
    params: { _q: 'Category A' },
    deletedCount: 0,
    remaining: ALL_ENTRY_NAMES,
  },
  // --- _q combined with where / filters ---
  {
    label: '_q + where: search narrowed by relation',
    params: {
      _q: 'LLORIS',
      where: { related: { title: 'Category A' } },
    },
    deletedCount: 1,
    remaining: ['Lucas HERNANDEZ', 'Samuel UMTITI'],
  },
  {
    label: '_q + filters: search narrowed by relation',
    params: {
      _q: 'UMTITI',
      filters: { related: { title: 'Category B' } },
    },
    deletedCount: 1,
    remaining: ['Hugo LLORIS', 'Lucas HERNANDEZ'],
  },
  {
    label: '_q + where + filters: full stack',
    params: {
      _q: 'H',
      where: { related: { title: 'Category A' } },
      filters: { name: { $containsi: 'lucas' } },
    },
    deletedCount: 1,
    remaining: ['Hugo LLORIS', 'Samuel UMTITI'],
  },
];

/**
 * Relation-filtered deleteMany must remove source rows only — never the joined targets.
 * `getParams` is optional for cases that need runtime ids from the DB.
 */
const deleteManyPreservesRelationTargetsCases = [
  {
    label: 'where: nested relation title',
    params: { where: { related: { title: 'Category A' } } },
    deletedCount: 2,
    remaining: ['Samuel UMTITI'],
  },
  {
    label: 'filters: nested relation title',
    params: { filters: { related: { title: 'Category A' } } },
    deletedCount: 2,
    remaining: ['Samuel UMTITI'],
  },
  {
    label: 'where: nested relation id',
    getParams: async () => {
      const categoryA = await strapi.db
        .query(RELATED_UID)
        .findOne({ where: { title: 'Category A' } });
      return { where: { related: { id: categoryA.id } } };
    },
    deletedCount: 2,
    remaining: ['Samuel UMTITI'],
  },
  {
    label: 'where: single linked row (other category untouched)',
    params: { where: { related: { title: 'Category B' } } },
    deletedCount: 1,
    remaining: ['Hugo LLORIS', 'Lucas HERNANDEZ'],
  },
  {
    label: 'where + filters: relation filter with scalar intersection',
    params: {
      where: { related: { title: 'Category A' } },
      filters: { name: 'Hugo LLORIS' },
    },
    deletedCount: 1,
    remaining: ['Lucas HERNANDEZ', 'Samuel UMTITI'],
  },
  {
    label: '_q + where: relation join for filtering only',
    params: {
      _q: 'LLORIS',
      where: { related: { title: 'Category A' } },
    },
    deletedCount: 1,
    remaining: ['Lucas HERNANDEZ', 'Samuel UMTITI'],
  },
  {
    label: 'unfiltered deleteMany on source collection',
    params: {},
    deletedCount: 3,
    remaining: [],
  },
];

/**
 * deleteMany uses pick(['_q', 'where', 'filters']) — same filter keys as count, not full findMany params.
 * Pagination/populate/select must not change which rows are deleted.
 */
const deleteManyIgnoredParamCases = [
  {
    label: 'limit is ignored',
    params: { where: { related: { title: 'Category A' } }, limit: 1 },
    deletedCount: 2,
    remaining: ['Samuel UMTITI'],
    expectedCount: 2,
  },
  {
    label: 'offset + orderBy + limit are ignored',
    params: {
      where: { related: { title: 'Category A' } },
      orderBy: { name: 'asc' },
      limit: 1,
      offset: 1,
    },
    deletedCount: 2,
    remaining: ['Samuel UMTITI'],
    expectedCount: 2,
  },
  {
    label: 'populate is ignored (no error, same as where-only)',
    params: {
      where: { related: { title: 'Category A' } },
      populate: ['related'],
    },
    deletedCount: 2,
    remaining: ['Samuel UMTITI'],
    expectedCount: 2,
  },
  {
    label: 'select is ignored',
    params: {
      where: { related: { title: 'Category B' } },
      select: ['name'],
    },
    deletedCount: 1,
    remaining: ['Hugo LLORIS', 'Lucas HERNANDEZ'],
    expectedCount: 1,
  },
  {
    label: 'findMany-shaped spread ignores pagination and populate',
    params: {
      where: { related: { title: 'Category A' } },
      orderBy: { name: 'asc' },
      limit: 1,
      offset: 0,
      populate: ['related'],
    },
    deletedCount: 2,
    remaining: ['Samuel UMTITI'],
    expectedCount: 2,
  },
  {
    label: 'filters honored, limit ignored',
    params: {
      filters: { name: { $containsi: 'e' } },
      limit: 1,
    },
    deletedCount: 2,
    remaining: ['Hugo LLORIS'],
    expectedCount: 2,
  },
];

/** deleteMany and count share the same picked filter keys. */
const deleteManyCountParityCases = [
  { label: 'where only', params: { where: { related: { title: 'Category A' } } } },
  { label: 'filters only', params: { filters: { name: 'Samuel UMTITI' } } },
  {
    label: 'where + filters',
    params: { where: { related: { title: 'Category A' } }, filters: { name: 'Hugo LLORIS' } },
  },
  { label: '_q + where', params: { _q: 'LLORIS', where: { related: { title: 'Category A' } } } },
  { label: 'unfiltered', params: {} },
];

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
});

/**
 * deleteMany filter matrix — one Strapi boot, reset rows between cases.
 * Avoids 18× listen/destroy cycles (~3 min) and reduces open-handle noise at teardown.
 */
describe('deleteMany filter params', () => {
  const resetTestEntries = async () => {
    await strapi.db.query(TEST_UID).deleteMany({});
    const related = await strapi.db
      .query('api::related.related')
      .findMany({ orderBy: { id: 'asc' } });

    for (const entry of fixtures.test({ related })) {
      await strapi.db.query(TEST_UID).create({ data: entry });
    }
  };

  beforeAll(async () => {
    await builder
      .addContentTypes([relatedCT, testCT])
      .addFixtures(relatedCT.singularName, fixtures.related)
      .addFixtures(testCT.singularName, fixtures.test)
      .build();

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  beforeEach(async () => {
    await resetTestEntries();
  });

  test.each(deleteManyFilterCases)(
    'deleteMany ($label): count/deleteMany agree and remaining rows match',
    async ({ params, deletedCount, remaining }) => {
      expect(await strapi.db.query(TEST_UID).count(params)).toBe(deletedCount);

      const deleteRes = await strapi.db.query(TEST_UID).deleteMany(params);
      expect(deleteRes.count).toBe(deletedCount);

      const remainingNames = (await strapi.db.query(TEST_UID).findMany())
        .map((entry) => entry.name)
        .sort();

      expect(remainingNames).toEqual([...remaining].sort());
    }
  );

  test.each(deleteManyPreservesRelationTargetsCases)(
    'deleteMany ($label): does not delete relation targets used in the filter',
    async ({ params, getParams, deletedCount, remaining }) => {
      const relatedBefore = await strapi.db.query(RELATED_UID).findMany({ orderBy: { id: 'asc' } });

      expect(relatedBefore.map((entry) => entry.title)).toEqual(ALL_RELATED_TITLES);

      const queryParams = getParams ? await getParams() : params;

      expect(await strapi.db.query(TEST_UID).count(queryParams)).toBe(deletedCount);

      const deleteRes = await strapi.db.query(TEST_UID).deleteMany(queryParams);
      expect(deleteRes.count).toBe(deletedCount);

      const remainingNames = (await strapi.db.query(TEST_UID).findMany())
        .map((entry) => entry.name)
        .sort();
      expect(remainingNames).toEqual([...remaining].sort());

      const relatedAfter = await strapi.db.query(RELATED_UID).findMany({ orderBy: { id: 'asc' } });

      expect(relatedAfter).toHaveLength(relatedBefore.length);
      relatedAfter.forEach((entry, index) => {
        expect(entry.id).toBe(relatedBefore[index].id);
        expect(entry.title).toBe(relatedBefore[index].title);
      });

      // Surviving source rows keep a valid relation to an untouched target.
      if (remaining.length > 0) {
        const survivors = await strapi.db.query(TEST_UID).findMany({
          populate: { related: { select: ['title'] } },
        });

        survivors.forEach((entry) => {
          expect(entry.related).toBeDefined();
          expect(ALL_RELATED_TITLES).toContain(entry.related.title);
        });
      }
    }
  );

  test.each(deleteManyIgnoredParamCases)(
    'deleteMany ignored params ($label)',
    async ({ params, deletedCount, remaining, expectedCount }) => {
      expect(await strapi.db.query(TEST_UID).count(params)).toBe(expectedCount);

      const deleteRes = await strapi.db.query(TEST_UID).deleteMany(params);
      expect(deleteRes.count).toBe(deletedCount);
      expect(deleteRes.count).toBe(expectedCount);

      const remainingNames = (await strapi.db.query(TEST_UID).findMany())
        .map((entry) => entry.name)
        .sort();
      expect(remainingNames).toEqual([...remaining].sort());

      const relatedAfter = await strapi.db.query(RELATED_UID).findMany();
      expect(relatedAfter.map((entry) => entry.title).sort()).toEqual(
        [...ALL_RELATED_TITLES].sort()
      );
    }
  );

  test.each(deleteManyCountParityCases)(
    'deleteMany ($label): delete count matches count() with the same params',
    async ({ params }) => {
      expect(await strapi.db.query(TEST_UID).count(params)).toBe(
        (await strapi.db.query(TEST_UID).deleteMany(params)).count
      );
    }
  );

  test('deleteMany: limit in params does not cap deletions (unlike findMany)', async () => {
    const params = { where: { related: { title: 'Category A' } }, limit: 1 };

    expect(await strapi.db.query(TEST_UID).findMany(params)).toHaveLength(1);
    expect(await strapi.db.query(TEST_UID).count(params)).toBe(2);
    expect((await strapi.db.query(TEST_UID).deleteMany(params)).count).toBe(2);
  });
});

/**
 * updateMany with relation filters uses the same subquery path as deleteMany (GH#11998 class).
 */
describe('updateMany relation filters', () => {
  const resetTestEntries = async () => {
    await strapi.db.query(TEST_UID).deleteMany({});
    const related = await strapi.db
      .query('api::related.related')
      .findMany({ orderBy: { id: 'asc' } });

    for (const entry of fixtures.test({ related })) {
      await strapi.db.query(TEST_UID).create({ data: entry });
    }
  };

  beforeAll(async () => {
    await builder
      .addContentTypes([relatedCT, testCT])
      .addFixtures(relatedCT.singularName, fixtures.related)
      .addFixtures(testCT.singularName, fixtures.test)
      .build();

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  beforeEach(async () => {
    await resetTestEntries();
  });

  test('updateMany: nested relation where updates matching rows only', async () => {
    const result = await strapi.db.query(TEST_UID).updateMany({
      where: { related: { title: 'Category A' } },
      data: { name: 'UPDATED' },
    });

    expect(result.count).toBe(2);

    const names = (await strapi.db.query(TEST_UID).findMany()).map((entry) => entry.name).sort();
    expect(names).toEqual(['Samuel UMTITI', 'UPDATED', 'UPDATED']);
  });

  test('updateMany: scalar relation id shorthand', async () => {
    const categoryB = await strapi.db
      .query(RELATED_UID)
      .findOne({ where: { title: 'Category B' } });

    const result = await strapi.db.query(TEST_UID).updateMany({
      where: { related: categoryB.id },
      data: { name: 'CATEGORY B ROW' },
    });

    expect(result.count).toBe(1);

    const names = (await strapi.db.query(TEST_UID).findMany()).map((entry) => entry.name).sort();
    expect(names).toEqual(['CATEGORY B ROW', 'Hugo LLORIS', 'Lucas HERNANDEZ']);
  });
});
