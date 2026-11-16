import knex from 'knex';
import { createEntityManager } from '../../entity-manager';
import { createMetadata } from '../../metadata';

const TEST_UID = 'api::test.test';
const RELATED_UID = 'api::related.related';

const PUBLISHED_A = '2020-01-01T00:00:00.000Z';
const PUBLISHED_B = '2021-01-01T00:00:00.000Z';

const models = [
  {
    uid: RELATED_UID,
    singularName: 'related',
    pluralName: 'relateds',
    tableName: 'relateds',
    attributes: {
      id: { type: 'increments' },
      title: { type: 'string' },
      locale: { type: 'string' },
      // Same column name as the root model (draftAndPublish-style overlap); string avoids
      // dialect datetime binding mismatches while still exercising ambiguous-column SQL.
      publishedAt: { type: 'string' },
    },
  },
  {
    uid: TEST_UID,
    singularName: 'test',
    pluralName: 'tests',
    tableName: 'tests',
    attributes: {
      id: { type: 'increments' },
      name: { type: 'string' },
      locale: { type: 'string' },
      publishedAt: { type: 'string' },
      views: { type: 'integer' },
      likes: { type: 'integer' },
      related: {
        type: 'relation',
        relation: 'manyToOne',
        target: RELATED_UID,
      },
    },
  },
];

const makeDb = () => {
  const connection = knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });

  const metadata = createMetadata(models as any);

  const db = {
    config: { settings: {} },
    connection,
    metadata,
    getConnection: (table?: string) => (table ? connection(table) : connection),
    dialect: {
      client: 'sqlite',
      useReturning: () => false,
      transformErrors(e: Error) {
        throw e;
      },
    },
    lifecycles: {
      run: jest.fn(async () => undefined),
    },
  } as any;

  return { db, connection };
};

const setupTables = async (connection: knex.Knex) => {
  await connection.schema.createTable('relateds', (t) => {
    t.increments('id');
    t.string('title');
    t.string('locale');
    t.string('published_at');
  });
  await connection.schema.createTable('tests', (t) => {
    t.increments('id');
    t.string('name');
    t.string('locale');
    t.string('published_at');
    t.integer('views').defaultTo(10);
    t.integer('likes').defaultTo(10);
  });
  await connection.schema.createTable('tests_related_lnk', (t) => {
    t.increments('id');
    t.integer('test_id');
    t.integer('related_id');
  });
  await connection('relateds').insert([
    { title: 'Category A', locale: 'en', published_at: PUBLISHED_A },
    { title: 'Category B', locale: 'fr', published_at: PUBLISHED_B },
  ]);
  await connection('tests').insert([
    { id: 1, name: 'Hugo LLORIS', locale: 'en', published_at: PUBLISHED_A },
    { id: 2, name: 'Samuel UMTITI', locale: 'fr', published_at: PUBLISHED_A },
    { id: 3, name: 'Lucas HERNANDEZ', locale: 'fr', published_at: PUBLISHED_B },
  ]);
  await connection('tests_related_lnk').insert([
    { test_id: 1, related_id: 1 },
    { test_id: 2, related_id: 2 },
    { test_id: 3, related_id: 1 },
  ]);
};

describe('relation subquery path (deleteMany / updateMany)', () => {
  it.each([
    [
      'nested relation where',
      { where: { related: { title: 'Category A' } } },
      2,
      ['Samuel UMTITI'],
    ],
    ['scalar relation id', { where: { related: 1 } }, 2, ['Samuel UMTITI']],
    [
      '_q + relation where',
      { _q: 'LLORIS', where: { related: { title: 'Category A' } } },
      1,
      ['Samuel UMTITI', 'Lucas HERNANDEZ'],
    ],
    [
      'relation + overlapping locale',
      { where: { related: { title: 'Category A' }, locale: 'en' } },
      1,
      ['Samuel UMTITI', 'Lucas HERNANDEZ'],
    ],
    [
      'relation + overlapping publishedAt',
      { where: { related: { title: 'Category A' }, publishedAt: PUBLISHED_A } },
      1,
      ['Samuel UMTITI', 'Lucas HERNANDEZ'],
    ],
  ])('deleteMany: %s', async (_label, params, expectedDeleted, expectedRemaining) => {
    const { db, connection } = makeDb();
    await setupTables(connection);
    const em = createEntityManager(db);

    const result = await em.deleteMany(TEST_UID, params);
    expect(result.count).toBe(expectedDeleted);

    const remaining = await connection('tests').orderBy('id').pluck('name');
    expect(remaining).toEqual(expectedRemaining);

    await connection.destroy();
  });

  it.each([
    [
      'nested relation where',
      { where: { related: { title: 'Category A' } }, data: { name: 'UPDATED A' } },
      2,
      { updated: ['UPDATED A', 'UPDATED A'], untouched: ['Samuel UMTITI'] },
    ],
    [
      'scalar relation in $and',
      {
        where: { $and: [{ related: 1 }, { name: 'Hugo LLORIS' }] },
        data: { name: 'UPDATED HUGO' },
      },
      1,
      { updated: ['UPDATED HUGO'], untouched: ['Samuel UMTITI', 'Lucas HERNANDEZ'] },
    ],
    [
      'relation + overlapping locale',
      {
        where: { related: { title: 'Category A' }, locale: 'en' },
        data: { name: 'UPDATED LOCALE' },
      },
      1,
      { updated: ['UPDATED LOCALE'], untouched: ['Samuel UMTITI', 'Lucas HERNANDEZ'] },
    ],
    [
      'relation + overlapping publishedAt',
      {
        where: { related: { title: 'Category A' }, publishedAt: PUBLISHED_A },
        data: { name: 'UPDATED PUBLISHED' },
      },
      1,
      { updated: ['UPDATED PUBLISHED'], untouched: ['Samuel UMTITI', 'Lucas HERNANDEZ'] },
    ],
    [
      '_q + relation where',
      {
        _q: 'LLORIS',
        where: { related: { title: 'Category A' } },
        data: { name: 'UPDATED Q' },
      },
      1,
      { updated: ['UPDATED Q'], untouched: ['Samuel UMTITI', 'Lucas HERNANDEZ'] },
    ],
    [
      'filters + relation where',
      {
        where: { related: { title: 'Category A' } },
        filters: { name: 'Hugo LLORIS' },
        data: { name: 'UPDATED FILTER' },
      },
      1,
      { updated: ['UPDATED FILTER'], untouched: ['Samuel UMTITI', 'Lucas HERNANDEZ'] },
    ],
  ])('updateMany: %s', async (_label, params, expectedUpdated, { updated, untouched }) => {
    const { db, connection } = makeDb();
    await setupTables(connection);
    const em = createEntityManager(db);

    const result = await em.updateMany(TEST_UID, params);
    expect(result.count).toBe(expectedUpdated);

    const rows = await connection('tests').orderBy('id').select('name');
    const updatedNames = rows.filter((r) => updated.includes(r.name)).map((r) => r.name);
    const untouchedNames = rows.filter((r) => untouched.includes(r.name)).map((r) => r.name);

    expect(updatedNames.sort()).toEqual([...updated].sort());
    expect(untouchedNames.sort()).toEqual([...untouched].sort());

    await connection.destroy();
  });

  it.each([
    [
      'increment',
      (qb: any) => qb.increment('views', 2),
      { views: [12, 10, 12], likes: [10, 10, 10] },
    ],
    [
      'decrement',
      (qb: any) => qb.decrement('views', 3),
      { views: [7, 10, 7], likes: [10, 10, 10] },
    ],
    [
      'increment + decrement on different columns',
      (qb: any) => qb.increment('views', 1).decrement('likes', 2),
      { views: [11, 10, 11], likes: [8, 10, 8] },
    ],
  ])('query builder %s: nested relation where', async (_label, apply, expected) => {
    const { db, connection } = makeDb();
    await setupTables(connection);
    const em = createEntityManager(db);

    const qb = em
      .createQueryBuilder(TEST_UID)
      .init({ where: { related: { title: 'Category A' } } });
    await apply(qb).execute();

    const rows = await connection('tests').orderBy('id').select('views', 'likes');
    expect(rows.map((r) => r.views)).toEqual(expected.views);
    expect(rows.map((r) => r.likes)).toEqual(expected.likes);

    await connection.destroy();
  });

  it('query builder update data + increment: nested relation where', async () => {
    const { db, connection } = makeDb();
    await setupTables(connection);
    const em = createEntityManager(db);

    await em
      .createQueryBuilder(TEST_UID)
      .init({ where: { related: { title: 'Category A' } } })
      .update({ name: 'UPDATED' })
      .increment('views', 1)
      .execute();

    const rows = await connection('tests').orderBy('id').select('name', 'views');
    expect(rows).toEqual([
      { name: 'UPDATED', views: 11 },
      { name: 'Samuel UMTITI', views: 10 },
      { name: 'UPDATED', views: 11 },
    ]);

    await connection.destroy();
  });

  it('query builder increment honours an explicit transaction', async () => {
    const { db, connection } = makeDb();
    await setupTables(connection);
    const em = createEntityManager(db);

    const trx = await connection.transaction();
    try {
      await em
        .createQueryBuilder(TEST_UID)
        .init({ where: { related: { title: 'Category A' } } })
        .increment('views', 5)
        .transacting(trx)
        .execute();

      expect(await trx('tests').orderBy('id').pluck('views')).toEqual([15, 10, 15]);
    } finally {
      await trx.rollback();
    }

    expect(await connection('tests').orderBy('id').pluck('views')).toEqual([10, 10, 10]);

    await connection.destroy();
  });
});
