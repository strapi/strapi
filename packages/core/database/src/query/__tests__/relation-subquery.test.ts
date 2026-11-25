import knex from 'knex';
import { createEntityManager } from '../../entity-manager';
import { createMetadata } from '../../metadata';
import { createScopeRegistry } from '../scopes';
import type { QueryBuilder } from '../query-builder';

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
      viewCount: { type: 'integer' },
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
    // The sqlite pool has one connection, so a write that escapes an open transaction
    // waits for it; fail fast instead of hitting the jest timeout.
    acquireConnectionTimeout: 1000,
  });

  const metadata = createMetadata(models as any);

  const db = {
    config: { settings: {} },
    connection,
    metadata,
    unstable_scopes: createScopeRegistry(),
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
    t.integer('view_count').defaultTo(10);
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

describe('relation subquery path (delete / update writes)', () => {
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
      (qb: QueryBuilder) => qb.increment('views', 2),
      { views: [12, 10, 12], likes: [10, 10, 10] },
    ],
    [
      'decrement',
      (qb: QueryBuilder) => qb.decrement('views', 3),
      { views: [7, 10, 7], likes: [10, 10, 10] },
    ],
    [
      'increment + decrement on different columns',
      (qb: QueryBuilder) => qb.increment('views', 1).decrement('likes', 2),
      { views: [11, 10, 11], likes: [8, 10, 8] },
    ],
    [
      'increment + decrement on the same column',
      (qb: any) => qb.increment('views', 2).decrement('views', 1),
      { views: [11, 10, 11], likes: [10, 10, 10] },
    ],
    [
      'two increments on the same column',
      (qb: any) => qb.increment('views', 2).increment('views', 3),
      { views: [15, 10, 15], likes: [10, 10, 10] },
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

  it.each([
    ['nested relation where', { related: { title: 'Category A' } }, [12, 10, 12]],
    ['scalar where (no subquery)', { name: 'Samuel UMTITI' }, [10, 12, 10]],
  ])(
    'query builder maps counter attribute names to columns: %s',
    async (_label, where, expected) => {
      const { db, connection } = makeDb();
      await setupTables(connection);
      const em = createEntityManager(db);

      await em.createQueryBuilder(TEST_UID).init({ where }).increment('viewCount', 2).execute();

      expect(await connection('tests').orderBy('id').pluck('view_count')).toEqual(expected);

      await connection.destroy();
    }
  );

  it.each([
    ['nested relation where', { related: { title: 'Category A' } }],
    ['scalar where (no subquery)', { name: 'Samuel UMTITI' }],
  ])(
    'query builder rejects a counter on a column also in update data: %s',
    async (_label, where) => {
      const { db, connection } = makeDb();
      await setupTables(connection);
      const em = createEntityManager(db);

      await expect(
        em
          .createQueryBuilder(TEST_UID)
          .init({ where })
          .update({ views: 1 })
          .increment('views', 2)
          .execute()
      ).rejects.toThrow('Cannot update and increment or decrement the column "views"');

      expect(await connection('tests').orderBy('id').pluck('views')).toEqual([10, 10, 10]);

      await connection.destroy();
    }
  );

  it('query builder ignores forUpdate and orderBy in the relation subquery', async () => {
    const { db, connection } = makeDb();
    await setupTables(connection);
    const em = createEntityManager(db);

    const qb = em
      .createQueryBuilder(TEST_UID)
      .init({ where: { related: { title: 'Category A' } }, orderBy: { name: 'asc' } })
      .forUpdate()
      .increment('views', 1);

    expect(qb.getKnexQuery().toString()).not.toMatch(/order by/i);

    await qb.execute();
    expect(await connection('tests').orderBy('id').pluck('views')).toEqual([11, 10, 11]);

    await connection.destroy();
  });

  it('query builder adds no relation-sort joins to an unpaginated scalar-filtered write', async () => {
    const { db, connection } = makeDb();
    await setupTables(connection);
    const em = createEntityManager(db);

    const qb = em
      .createQueryBuilder(TEST_UID)
      .init({ where: { name: 'Hugo LLORIS' }, orderBy: { related: { title: 'asc' } } })
      .increment('views', 1);

    const sql = qb.getKnexQuery().toString();
    expect(sql).not.toMatch(/join/i);
    expect(sql).not.toMatch(/order by/i);
    expect(sql).not.toMatch(/select/i);

    await qb.execute();
    expect(await connection('tests').orderBy('id').pluck('views')).toEqual([11, 10, 10]);

    await connection.destroy();
  });

  it('query builder adds no relation-sort joins when orderBy and a relation filter both apply', async () => {
    const { db, connection } = makeDb();
    await setupTables(connection);
    const em = createEntityManager(db);

    const withSort = em
      .createQueryBuilder(TEST_UID)
      .init({ where: { related: 1 }, orderBy: { related: { title: 'asc' } } })
      .increment('views', 1);
    const withoutSort = em
      .createQueryBuilder(TEST_UID)
      .init({ where: { related: 1 } })
      .increment('views', 1);

    // Only the joins from the relation filter, none from the relation sort.
    expect(withSort.getKnexQuery().toString()).toBe(withoutSort.getKnexQuery().toString());

    await withSort.execute();
    expect(await connection('tests').orderBy('id').pluck('views')).toEqual([11, 10, 11]);

    await connection.destroy();
  });

  it.each([
    ['increment', (qb: QueryBuilder) => qb.increment('views', 1)],
    ['update', (qb: QueryBuilder) => qb.update({ name: 'UPDATED' })],
    ['delete', (qb: QueryBuilder) => qb.delete()],
  ])('query builder treats limit: -1 as unbounded for %s', async (_label, apply) => {
    const { db, connection } = makeDb();
    await setupTables(connection);
    const em = createEntityManager(db);

    const qb = em.createQueryBuilder(TEST_UID).init({
      where: { related: { title: 'Category A' } },
      orderBy: { related: { title: 'asc' } },
      limit: -1,
    });

    const sql = apply(qb).getKnexQuery().toString();
    // Only the relation filter's two joins; the relation sort adds none and orderBy is dropped.
    expect(sql.match(/left join/gi)).toHaveLength(2);
    expect(sql).not.toMatch(/order by/i);

    await connection.destroy();
  });

  it.each([
    ['limit', { limit: 1 }],
    ['offset', { offset: 1 }],
  ])('query builder keeps relation-sort orderBy for a write with %s', async (_label, page) => {
    const { db, connection } = makeDb();
    await setupTables(connection);
    const em = createEntityManager(db);

    const qb = em
      .createQueryBuilder(TEST_UID)
      .init({ where: { name: 'Hugo LLORIS' }, orderBy: { related: { title: 'asc' } }, ...page })
      .increment('views', 1);

    const sql = qb.getKnexQuery().toString();
    expect(sql).toMatch(/left join/i);
    expect(sql).toMatch(/order by/i);

    await connection.destroy();
  });

  it('query builder does not emit FOR UPDATE in the relation subquery (pg SQL)', async () => {
    // The SQLite compiler writes forUpdate() as an empty string, so compile with the pg
    // dialect. No connection is opened: only the SQL is generated.
    const connection = knex({ client: 'pg' });
    const db = {
      ...makeDb().db,
      connection,
      getConnection: (table?: string) => (table ? connection(table) : connection),
    } as any;
    const em = createEntityManager(db);

    const qb = em
      .createQueryBuilder(TEST_UID)
      .init({ where: { related: { title: 'Category A' } } })
      .forUpdate()
      .increment('views', 1);

    // Sanity check: a plain select with forUpdate does emit the clause on pg.
    expect(
      em
        .createQueryBuilder(TEST_UID)
        .init({ where: { name: 'Hugo LLORIS' } })
        .forUpdate()
        .getKnexQuery()
        .toString()
    ).toMatch(/for update/i);

    expect(qb.getKnexQuery().toString()).not.toMatch(/for update/i);

    await connection.destroy();
  });

  it.each([
    ['increment', (qb: QueryBuilder) => qb.increment('views', 1), 'views', [10, 10, 11]],
    [
      'update',
      (qb: QueryBuilder) => qb.update({ name: 'UPDATED' }),
      'name',
      ['Hugo LLORIS', 'Samuel UMTITI', 'UPDATED'],
    ],
    ['delete', (qb: QueryBuilder) => qb.delete(), 'name', ['Hugo LLORIS', 'Samuel UMTITI']],
  ])(
    'query builder first() keeps orderBy to pick the row for %s',
    async (_label, apply, column, expected) => {
      const { db, connection } = makeDb();
      await setupTables(connection);
      const em = createEntityManager(db);

      // Rows 1 (Hugo) and 3 (Lucas) match; name desc makes row 3 the first one.
      const qb = em
        .createQueryBuilder(TEST_UID)
        .init({ where: { related: { title: 'Category A' } }, orderBy: { name: 'desc' } })
        .first();
      await apply(qb).execute();

      expect(await connection('tests').orderBy('id').pluck(column)).toEqual(expected);

      await connection.destroy();
    }
  );

  it.each([
    ['numeric string increment', (qb: any) => qb.increment('views', '2'), [12, 10, 12]],
    ['numeric string decrement', (qb: any) => qb.decrement('views', '3'), [7, 10, 7]],
    ['negative numeric string', (qb: any) => qb.increment('views', '-2'), [8, 10, 8]],
    [
      'two numeric string increments on the same column',
      (qb: any) => qb.increment('views', '2').increment('views', '3'),
      [15, 10, 15],
    ],
  ])('query builder sums %s as numbers: nested relation where', async (_label, apply, expected) => {
    const { db, connection } = makeDb();
    await setupTables(connection);
    const em = createEntityManager(db);

    const qb = em
      .createQueryBuilder(TEST_UID)
      .init({ where: { related: { title: 'Category A' } } });
    await apply(qb).execute();

    expect(await connection('tests').orderBy('id').pluck('views')).toEqual(expected);

    await connection.destroy();
  });

  it.each([['abc'], [''], ['   '], [NaN], [Infinity], [null], [true]])(
    'query builder rejects a non-numeric counter amount: %p',
    async (amount) => {
      const { db, connection } = makeDb();
      await setupTables(connection);
      const em = createEntityManager(db);

      await expect(
        em
          .createQueryBuilder(TEST_UID)
          .init({ where: { related: { title: 'Category A' } } })
          .increment('views', amount as any)
          .execute()
      ).rejects.toThrow('non-numeric amount');

      expect(await connection('tests').orderBy('id').pluck('views')).toEqual([10, 10, 10]);

      await connection.destroy();
    }
  );

  it.each([
    [
      'decrement object on scalar where',
      { name: 'Samuel UMTITI' },
      (qb: any) => qb.decrement({ views: 2, viewCount: 3 }),
      { views: [10, 8, 10], viewCount: [10, 7, 10] },
    ],
    [
      'increment and decrement objects on nested relation where',
      { related: { title: 'Category A' } },
      (qb: any) => qb.increment({ views: 5, viewCount: 1 }).decrement({ views: 2 }),
      { views: [13, 10, 13], viewCount: [11, 10, 11] },
    ],
  ])('query builder expands counter column objects: %s', async (_label, where, apply, expected) => {
    const { db, connection } = makeDb();
    await setupTables(connection);
    const em = createEntityManager(db);

    const qb = em.createQueryBuilder(TEST_UID).init({ where });
    await apply(qb).execute();

    expect(await connection('tests').orderBy('id').pluck('views')).toEqual(expected.views);
    expect(await connection('tests').orderBy('id').pluck('view_count')).toEqual(expected.viewCount);

    await connection.destroy();
  });

  it.each([[null], [123], [''], [['views']], [{}]])(
    'query builder rejects an invalid counter column: %p',
    async (column) => {
      const { db, connection } = makeDb();
      await setupTables(connection);
      const em = createEntityManager(db);

      await expect(
        em
          .createQueryBuilder(TEST_UID)
          .init({ where: { related: { title: 'Category A' } } })
          .decrement(column as any, 2)
          .execute()
      ).rejects.toThrow(/Counter column/);

      expect(await connection('tests').orderBy('id').pluck('views')).toEqual([10, 10, 10]);

      await connection.destroy();
    }
  );

  it('clone() does not share state arrays with the original', async () => {
    const { db, connection } = makeDb();
    await setupTables(connection);
    const em = createEntityManager(db);

    const base = em.createQueryBuilder(TEST_UID).where({ name: 'Samuel UMTITI' });
    const a = base.clone().increment('views', 1);
    base.clone().increment('views', 100).where({ name: 'Hugo LLORIS' });

    await a.execute();
    expect(await connection('tests').orderBy('id').pluck('views')).toEqual([10, 11, 10]);

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

  it('query builder increment + decrement: scalar where (no subquery)', async () => {
    const { db, connection } = makeDb();
    await setupTables(connection);
    const em = createEntityManager(db);

    await em
      .createQueryBuilder(TEST_UID)
      .init({ where: { name: 'Samuel UMTITI' } })
      .increment('views', 4)
      .decrement('likes', 1)
      .execute();

    const rows = await connection('tests').orderBy('id').select('views', 'likes');
    expect(rows).toEqual([
      { views: 10, likes: 10 },
      { views: 14, likes: 9 },
      { views: 10, likes: 10 },
    ]);

    await connection.destroy();
  });

  it.each([
    [
      'increment',
      (qb: QueryBuilder) => qb.increment('views', 5),
      (trx: knex.Knex.Transaction) => trx('tests').orderBy('id').pluck('views'),
      [15, 10, 15],
    ],
    [
      'update',
      (qb: QueryBuilder) => qb.update({ name: 'UPDATED' }),
      (trx: knex.Knex.Transaction) => trx('tests').orderBy('id').pluck('name'),
      ['UPDATED', 'Samuel UMTITI', 'UPDATED'],
    ],
    [
      'delete',
      (qb: QueryBuilder) => qb.delete(),
      (trx: knex.Knex.Transaction) => trx('tests').orderBy('id').pluck('name'),
      ['Samuel UMTITI'],
    ],
  ])(
    'query builder %s honours an explicit transaction',
    async (_label, apply, read, expectedInTrx) => {
      const { db, connection } = makeDb();
      await setupTables(connection);
      const em = createEntityManager(db);

      const trx = await connection.transaction();
      try {
        const qb = em
          .createQueryBuilder(TEST_UID)
          .init({ where: { related: { title: 'Category A' } } });
        await apply(qb).transacting(trx).execute();

        expect(await read(trx)).toEqual(expectedInTrx);
      } finally {
        await trx.rollback();
      }

      expect(await connection('tests').orderBy('id').select('name', 'views')).toEqual([
        { name: 'Hugo LLORIS', views: 10 },
        { name: 'Samuel UMTITI', views: 10 },
        { name: 'Lucas HERNANDEZ', views: 10 },
      ]);

      await connection.destroy();
    }
  );
});
