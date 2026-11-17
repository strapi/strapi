import knex from 'knex';
import type { Knex } from 'knex';
import { createEntityManager } from '../../entity-manager';
import { createMetadata } from '../../metadata';
import createQueryBuilder from '../query-builder';
import { createScopeRegistry } from '../scopes';
import type { QueryScope } from '../scopes';
import type { Database } from '../..';
import type { Model } from '../../types';
import { transactionCtx } from '../../transaction-context';
import { metadataToSchema } from '../../schema/schema';

const ARTICLE_UID = 'api::article.article';
const CATEGORY_UID = 'api::category.category';

const models = [
  {
    uid: CATEGORY_UID,
    singularName: 'category',
    pluralName: 'categories',
    tableName: 'categories',
    attributes: {
      id: { type: 'increments' },
      name: { type: 'string' },
    },
  },
  {
    uid: ARTICLE_UID,
    singularName: 'article',
    pluralName: 'articles',
    tableName: 'articles',
    attributes: {
      id: { type: 'increments' },
      title: { type: 'string' },
      views: { type: 'integer' },
      category: { type: 'relation', relation: 'manyToOne', target: CATEGORY_UID },
    },
  },
];

// `deleted_at` is a column but not an attribute, so the scope uses a raw column key
const softDelete: QueryScope = {
  name: 'soft-delete',
  where: ({ uid }) => (uid === ARTICLE_UID ? { deleted_at: null } : null),
};

// Stub with only the members the entity manager uses
const createDb = (connection: Knex, metadata: ReturnType<typeof createMetadata>) => {
  const db = {
    connection,
    metadata,
    scopes: createScopeRegistry(),
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
  } as unknown as Database;

  db.entityManager = createEntityManager(db);
  return db;
};

const createConnection = () =>
  knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
    // A query that misses an open transaction waits for the one connection: fail fast
    acquireConnectionTimeout: 1000,
  });

const setup = async (connection: Knex) => {
  await connection.schema.createTable('categories', (t) => {
    t.increments('id');
    t.string('name');
  });
  await connection.schema.createTable('articles', (t) => {
    t.increments('id');
    t.string('title');
    t.integer('views').defaultTo(0);
    t.string('deleted_at');
  });
  await connection.schema.createTable('articles_category_lnk', (t) => {
    t.increments('id');
    t.integer('article_id');
    t.integer('category_id');
  });
  await connection('categories').insert([{ name: 'News' }]);
  await connection('articles').insert([
    { title: 'visible' },
    { title: 'hidden', deleted_at: '2026-01-01' },
  ]);
  await connection('articles_category_lnk').insert([
    { article_id: 1, category_id: 1 },
    { article_id: 2, category_id: 1 },
  ]);

  return createDb(connection, createMetadata(models as unknown as Model[]));
};

describe('query scopes on the main table', () => {
  let connection: Knex;
  let db: Database;
  let sqls: string[];

  const titles = async () =>
    (await connection('articles').orderBy('id').select('title')).map((row) => row.title);

  beforeEach(async () => {
    connection = createConnection();
    db = await setup(connection);
    sqls = [];
    connection.on('query', ({ sql }) => sqls.push(sql));
  });

  afterEach(async () => {
    await connection.destroy();
  });

  describe('with the test scope registered', () => {
    beforeEach(() => {
      db.scopes.register(softDelete);
    });

    it('scopes select on the aliased column with no join', async () => {
      const rows = await db.entityManager.findMany(ARTICLE_UID, {});

      expect(rows.map((row: { title: string }) => row.title)).toEqual(['visible']);
      expect(sqls).toEqual([
        'select `t0`.* from `articles` as `t0` where (`t0`.`deleted_at` is null)',
      ]);
    });

    it('scopes count', async () => {
      expect(await db.entityManager.count(ARTICLE_UID, {})).toBe(1);
      expect(sqls[0]).toContain('where (`t0`.`deleted_at` is null)');
    });

    it('scopes max and min', async () => {
      const qb = (type: 'max' | 'min') =>
        db.entityManager.createQueryBuilder(ARTICLE_UID)[type]('id').first().execute();

      expect(await qb('max')).toEqual({ max: 1 });
      expect(await qb('min')).toEqual({ min: 1 });
      // Without joins, max and min do not alias the table
      expect(sqls).toEqual([
        'select max(`id`) as `max` from `articles` where (`deleted_at` is null) limit ?',
        'select min(`id`) as `min` from `articles` where (`deleted_at` is null) limit ?',
      ]);
    });

    it('scopes update and delete', async () => {
      await db.entityManager.updateMany(ARTICLE_UID, { where: {}, data: { title: 'changed' } });
      expect(await titles()).toEqual(['changed', 'hidden']);

      await db.entityManager.deleteMany(ARTICLE_UID, { where: {} });
      expect(await titles()).toEqual(['hidden']);

      expect(sqls.filter((sql) => /^(update|delete)/.test(sql))).toEqual([
        'update `articles` set `title` = ? where (`deleted_at` is null)',
        'delete from `articles` where (`deleted_at` is null)',
      ]);
    });

    it('scopes the inner select of update and delete with a join', async () => {
      const where = { category: { name: 'News' } };

      await db.entityManager.updateMany(ARTICLE_UID, { where, data: { title: 'changed' } });
      expect(await titles()).toEqual(['changed', 'hidden']);

      await db.entityManager.deleteMany(ARTICLE_UID, { where });
      expect(await titles()).toEqual(['hidden']);

      const writes = sqls.filter((sql) => /^(update|delete)/.test(sql));
      expect(writes).toHaveLength(2);
      writes.forEach((sql) => expect(sql).toContain('`t0`.`deleted_at` is null'));
    });

    it('rejects the query when where throws', async () => {
      db.scopes.register({
        name: 'broken',
        where() {
          throw new Error('scope failed');
        },
      });

      await expect(db.entityManager.findMany(ARTICLE_UID, {})).rejects.toThrow('scope failed');
      expect(sqls).toEqual([]);
    });
  });

  it('builds the unscoped SQL when where returns null', async () => {
    await db.entityManager.findMany(ARTICLE_UID, {});
    db.scopes.register({ name: 'none', where: () => null });
    await db.entityManager.findMany(ARTICLE_UID, {});

    expect(sqls[1]).toBe(sqls[0]);
  });

  it('calls where with join-table names', async () => {
    const uids: string[] = [];
    db.scopes.register({
      name: 'spy',
      where({ uid }) {
        uids.push(uid);
        return null;
      },
    });

    // Core reads and deletes relation links through a query builder on the join table
    await db.entityManager.createQueryBuilder('articles_category_lnk').select('*').execute();
    await db.entityManager.createQueryBuilder('articles_category_lnk').delete().execute();

    expect(uids).toEqual(['articles_category_lnk', 'articles_category_lnk']);
  });

  it('keeps the unaliased SQL of max and min without joins', async () => {
    await db.entityManager.createQueryBuilder(ARTICLE_UID).max('id').first().execute();
    await db.entityManager.createQueryBuilder(ARTICLE_UID).min('id').first().execute();

    expect(sqls).toEqual([
      'select max(`id`) as `max` from `articles` limit ?',
      'select min(`id`) as `min` from `articles` limit ?',
    ]);
  });

  describe('with a scope whose where names a relation', () => {
    const rows = async () => connection('articles').orderBy('id').select('title', 'views');

    beforeEach(async () => {
      await connection('categories').insert({ name: 'Sport' });
      await connection('articles').insert({ title: 'sport' });
      await connection('articles_category_lnk').insert({ article_id: 3, category_id: 2 });
      db.scopes.register({
        name: 'news',
        where: ({ uid }) => (uid === ARTICLE_UID ? { category: { name: 'News' } } : null),
      });
    });

    it('increments with no data through the join', async () => {
      await db.entityManager.createQueryBuilder(ARTICLE_UID).increment('views', 2).execute();

      expect(await rows()).toEqual([
        { title: 'visible', views: 2 },
        { title: 'hidden', views: 2 },
        { title: 'sport', views: 0 },
      ]);
    });

    it('keeps the increment out of the inner select of update(data)', async () => {
      await db.entityManager
        .createQueryBuilder(ARTICLE_UID)
        .update({ title: 'changed' })
        .increment('views')
        .execute();

      expect(await rows()).toEqual([
        { title: 'changed', views: 1 },
        { title: 'changed', views: 1 },
        { title: 'sport', views: 0 },
      ]);
      expect(sqls.filter((sql) => sql.startsWith('update'))).toHaveLength(1);
    });

    it('runs update and delete in the explicit transaction', async () => {
      const trx = await connection.transaction();
      const qb = () => db.entityManager.createQueryBuilder(ARTICLE_UID).transacting(trx);

      await qb().update({ title: 'changed' }).execute();
      await qb().delete().execute();
      await trx.rollback();

      expect(await titles()).toEqual(['visible', 'hidden', 'sport']);
    });

    it('scopes max and min', async () => {
      const qb = (type: 'max' | 'min') =>
        db.entityManager
          .createQueryBuilder(ARTICLE_UID)
          [type]('id')
          .where({ id: { $gt: 0 } })
          .first()
          .execute();

      expect(await qb('max')).toEqual({ max: 2 });
      expect(await qb('min')).toEqual({ min: 1 });
    });
  });

  it('does not call where for insert and truncate', async () => {
    const where = jest.fn(() => null);
    db.scopes.register({ name: 'spy', where });

    await db.entityManager.createQueryBuilder(ARTICLE_UID).insert({ title: 'new' }).execute();
    // The QueryBuilder has no truncate(): only the initial state sets the type
    createQueryBuilder(ARTICLE_UID, db, { type: 'truncate' }).getKnexQuery();

    expect(where).not.toHaveBeenCalled();
  });

  it('rejects the query when where returns undefined', async () => {
    db.scopes.register({
      name: 'forgot-return',
      // @ts-expect-error a scope that forgets to return
      where() {},
    });

    await expect(db.entityManager.findMany(ARTICLE_UID, {})).rejects.toThrow('forgot-return');
    expect(sqls).toEqual([]);
  });

  it.each([{}, [], { $and: [] }, { $or: [] }])(
    'rejects the query when where returns %j, which matches every row',
    async (shape) => {
      // A JavaScript scope can return [], which the type does not allow
      db.scopes.register({ name: 'matches-all', where: () => shape as Record<string, unknown> });

      await expect(db.entityManager.findMany(ARTICLE_UID, {})).rejects.toThrow('matches-all');
      expect(sqls).toEqual([]);
    }
  );

  it('throws on a duplicate name', () => {
    db.scopes.register(softDelete);

    expect(() => db.scopes.register({ ...softDelete })).toThrow('soft-delete');
  });

  it('removes the scope with the unregister function', async () => {
    const unregister = db.scopes.register(softDelete);
    unregister();

    expect(await db.entityManager.count(ARTICLE_UID, {})).toBe(2);
  });

  it('keeps a later registration when a stale unregister runs again', async () => {
    const unregister = db.scopes.register(softDelete);
    unregister();
    db.scopes.register(softDelete);
    unregister();

    expect(await db.entityManager.count(ARTICLE_UID, {})).toBe(1);
  });

  describe('prepare', () => {
    it('gets the transaction the query runs in', async () => {
      let titlesSeen: string[] = [];
      let trxSeen: unknown;
      db.scopes.register({
        name: 'reads-in-trx',
        async prepare({ trx }) {
          trxSeen = trx;
          const query = db.connection('articles').select('title');
          const rows = await (trx ? query.transacting(trx) : query);
          titlesSeen = rows.map((row) => row.title);
        },
        where: () => null,
      });

      // execute() runs the query in the active transaction, over an explicit one
      const explicit = await connection.transaction();
      await explicit.commit();

      // The body of db.transaction(), which the stub db does not have
      const trx = await connection.transaction();
      try {
        await transactionCtx.run(trx, async () => {
          await trx('articles').insert({ title: 'uncommitted' });
          await db.entityManager
            .createQueryBuilder(ARTICLE_UID)
            .count()
            .transacting(explicit)
            .execute();
        });
      } finally {
        await trx.rollback();
      }

      expect(trxSeen).toBe(trx);
      expect(titlesSeen).toContain('uncommitted');
    });

    // where throws unless prepare settled first
    const preparedScope = () => {
      let ready = false;
      return {
        name: 'prepared',
        async prepare() {
          await new Promise((resolve) => {
            setImmediate(resolve);
          });
          ready = true;
        },
        where() {
          if (!ready) {
            throw new Error('where ran before prepare');
          }
          return { deleted_at: null };
        },
      };
    };

    it('resolves before execute builds the SQL', async () => {
      db.scopes.register(preparedScope());

      expect(await db.entityManager.count(ARTICLE_UID, {})).toBe(1);
    });

    it('is not awaited by getKnexQuery() outside execute()', () => {
      db.scopes.register(preparedScope());

      // Nested subqueries build SQL this way, so where must throw rather than return null
      expect(() =>
        db.entityManager.createQueryBuilder(ARTICLE_UID).select('id').getKnexQuery()
      ).toThrow('where ran before prepare');
    });

    it('gets the explicit transaction in a stream, which does not join the active one', async () => {
      let trxSeen: unknown;
      db.scopes.register({
        name: 'spy',
        async prepare({ trx }) {
          trxSeen = trx;
        },
        where: () => null,
      });

      // SQLite has one connection: the active transaction is closed, the explicit one is open
      const active = await connection.transaction();
      await active.commit();
      const explicit = await connection.transaction();
      try {
        await transactionCtx.run(active, () =>
          db.entityManager
            .createQueryBuilder(ARTICLE_UID)
            .select('*')
            .transacting(explicit)
            .stream()
            .toArray()
        );
      } finally {
        await explicit.rollback();
      }

      expect(trxSeen).toBe(explicit);
    });

    it('resolves before the first read of a stream', async () => {
      db.scopes.register(preparedScope());

      const rows = await db.entityManager
        .createQueryBuilder(ARTICLE_UID)
        .select('*')
        .stream()
        .toArray();

      expect(rows.map((row: { title: string }) => row.title)).toEqual(['visible']);
    });

    it('does not build or run the query when the stream is destroyed during prepare', async () => {
      let release = () => {};
      const where = jest.fn(() => null);
      db.scopes.register({
        name: 'slow',
        prepare: () =>
          new Promise<void>((resolve) => {
            release = resolve;
          }),
        where,
      });

      const stream = db.entityManager.createQueryBuilder(ARTICLE_UID).select('*').stream();
      // read() starts the first _read(), which waits on prepare
      stream.read();
      stream.destroy();
      release();
      await new Promise((resolve) => {
        setImmediate(resolve);
      });

      expect(where).not.toHaveBeenCalled();
      expect(sqls).toEqual([]);
    });

    it('destroys the stream with the error of a failed prepare', async () => {
      db.scopes.register({
        name: 'failing',
        prepare: () => Promise.reject(new Error('prepare failed')),
        where: () => null,
      });

      const stream = db.entityManager.createQueryBuilder(ARTICLE_UID).select('*').stream();

      await expect(stream.toArray()).rejects.toThrow('prepare failed');
    });
  });
});

const TAG_UID = 'api::tag.tag';
const COMMENT_UID = 'api::comment.comment';

const joinModels = [
  {
    uid: CATEGORY_UID,
    singularName: 'category',
    pluralName: 'categories',
    tableName: 'categories',
    attributes: {
      id: { type: 'increments' },
      name: { type: 'string' },
      articles: {
        type: 'relation',
        relation: 'morphMany',
        target: ARTICLE_UID,
        morphBy: 'targets',
      },
    },
  },
  {
    uid: TAG_UID,
    singularName: 'tag',
    pluralName: 'tags',
    tableName: 'tags',
    attributes: {
      id: { type: 'increments' },
      name: { type: 'string' },
    },
  },
  {
    uid: COMMENT_UID,
    singularName: 'comment',
    pluralName: 'comments',
    tableName: 'comments',
    attributes: {
      id: { type: 'increments' },
      body: { type: 'string' },
      owner: { type: 'relation', relation: 'morphToOne' },
    },
  },
  {
    uid: ARTICLE_UID,
    singularName: 'article',
    pluralName: 'articles',
    tableName: 'articles',
    attributes: {
      id: { type: 'increments' },
      title: { type: 'string' },
      category: { type: 'relation', relation: 'manyToOne', target: CATEGORY_UID },
      section: {
        type: 'relation',
        relation: 'manyToOne',
        target: CATEGORY_UID,
        useJoinTable: false,
      },
      tags: { type: 'relation', relation: 'manyToMany', target: TAG_UID },
      targets: { type: 'relation', relation: 'morphToMany' },
      comments: { type: 'relation', relation: 'morphMany', target: COMMENT_UID, morphBy: 'owner' },
    },
  },
];

const MODEL_UIDS = joinModels.map((model) => model.uid);

// Hides the soft-deleted rows of every model. Join tables have no deleted_at column
const hideDeleted: QueryScope = {
  name: 'hide-deleted',
  where: ({ uid }) => (MODEL_UIDS.includes(uid) ? { deleted_at: null } : null),
};

const setupJoins = async (connection: Knex) => {
  const metadata = createMetadata(joinModels as unknown as Model[]);
  const modelTables = joinModels.map((model) => model.tableName);

  for (const table of metadataToSchema(metadata).tables) {
    await connection.schema.createTable(table.name, (t) => {
      for (const { type, name } of table.columns) {
        // These models only map to these Knex column methods, none with args
        t[type as 'increments' | 'string' | 'integer' | 'double'](name);
      }

      if (modelTables.includes(table.name)) {
        t.string('deleted_at');
      }
    });
  }

  const hidden = { deleted_at: '2026-01-01' };
  await connection('categories').insert([{ name: 'News' }, { name: 'Old', ...hidden }]);
  await connection('tags').insert([{ name: 'red' }, { name: 'yellow', ...hidden }]);
  await connection('articles').insert([
    { title: 'A1' },
    { title: 'A2', section_id: 2 },
    { title: 'A3', ...hidden },
  ]);
  await connection('comments').insert([
    { body: 'c1', target_id: 1, target_type: ARTICLE_UID, ...hidden },
  ]);
  await connection('articles_category_lnk').insert([
    { article_id: 1, category_id: 1 },
    { article_id: 2, category_id: 2 },
  ]);
  await connection('articles_tags_lnk').insert([
    { article_id: 1, tag_id: 1 },
    { article_id: 1, tag_id: 2 },
    { article_id: 2, tag_id: 2 },
  ]);
  await connection('articles_targets_mph').insert([
    { article_id: 1, targets_id: 1, targets_type: CATEGORY_UID, field: 'articles' },
    { article_id: 1, targets_id: 2, targets_type: CATEGORY_UID, field: 'articles' },
    { article_id: 3, targets_id: 1, targets_type: CATEGORY_UID, field: 'articles' },
  ]);

  return createDb(connection, metadata);
};

describe('query scopes on joins', () => {
  let connection: Knex;
  let db: Database;
  let sqls: string[];

  const titles = (rows: { title: string }[]) => rows.map((row) => row.title);

  beforeEach(async () => {
    connection = createConnection();
    db = await setupJoins(connection);
    sqls = [];
    connection.on('query', ({ sql }) => sqls.push(sql));
  });

  afterEach(async () => {
    await connection.destroy();
  });

  describe('with the test scope registered', () => {
    beforeEach(() => {
      db.scopes.register(hideDeleted);
    });

    it('scopes the join table of a relation filter on its inverse join column', async () => {
      const rows = await db.entityManager.findMany(ARTICLE_UID, {
        where: { category: { name: 'Old' } },
      });

      expect(rows).toEqual([]);
      expect(sqls).toEqual([
        'select distinct `t0`.* from `articles` as `t0` ' +
          'left join `articles_category_lnk` as `t1` on `t0`.`id` = `t1`.`article_id` ' +
          'and exists (select 1 from `categories` as `t3` where (`t3`.`id` = `t1`.`category_id` and `t3`.`deleted_at` is null)) ' +
          'left join `categories` as `t2` on `t1`.`category_id` = `t2`.`id` ' +
          'where (`t2`.`name` = ? and `t0`.`deleted_at` is null)',
      ]);
    });

    it.each([
      ['a manyToMany', { tags: { name: 'yellow' } }],
      ['a join column', { section: { name: 'Old' } }],
      ['a morph column', { comments: { body: 'c1' } }],
    ])('reads a hidden target as no row in a filter through %s', async (_, where) => {
      expect(await db.entityManager.findMany(ARTICLE_UID, { where })).toEqual([]);
    });

    it('reads a hidden target as no row in a filter through a morph join table', async () => {
      const rows = await db.entityManager.findMany(CATEGORY_UID, {
        where: { articles: { title: 'A3' } },
      });

      expect(rows).toEqual([]);
      expect(sqls[0]).toContain(
        'left join `articles_targets_mph` as `t1` on `t0`.`id` = `t1`.`targets_id` ' +
          'and `t1`.`targets_type` = ? and `t1`.`field` = ? ' +
          'and exists (select 1 from `articles` as `t3` where (`t3`.`id` = `t1`.`article_id` and `t3`.`deleted_at` is null)) ' +
          'left join `articles` as `t2` on `t1`.`article_id` = `t2`.`id` where'
      );
    });

    it('reads a hidden target as null in a relation sort', async () => {
      const rows = await db.entityManager.findMany(ARTICLE_UID, {
        orderBy: { category: { name: 'desc' } },
      });

      // Unscoped, Old sorts first. Scoped, it reads as null, which SQLite sorts last in desc
      expect(titles(rows)).toEqual(['A1', 'A2']);
    });

    it('reads a hidden target as null in a deep sort over a manyToMany', async () => {
      const rows = await db.entityManager.findMany(ARTICLE_UID, {
        orderBy: { tags: { name: 'asc' } },
      });

      // Unscoped, A1 sorts on red and A2 on yellow. Scoped, A2 has no visible tag and sorts on
      // null, which SQLite puts first
      expect(titles(rows)).toEqual(['A2', 'A1']);
      // The deep sort wrap takes its aliases after the join scope: none repeats a subquery alias
      const aliases = sqls[0].match(/ as `t\d+`/g) ?? [];
      expect(aliases).toHaveLength(new Set(aliases).size);
    });

    it('does not match a $null filter through a link to a hidden target', async () => {
      // A1 links to red and to the hidden yellow, A2 only to yellow
      const where = { tags: { id: { $null: true } } };

      expect(titles(await db.entityManager.findMany(ARTICLE_UID, { where }))).toEqual(['A2']);
      expect(await db.entityManager.count(ARTICLE_UID, { where })).toBe(1);
      await db.entityManager.deleteMany(ARTICLE_UID, { where });
      expect(await connection('articles').orderBy('id').pluck('title')).toEqual(['A1', 'A3']);
    });

    it('populates a hidden target as no row', async () => {
      const [a1, a2] = await db.entityManager.findMany(ARTICLE_UID, {
        populate: ['category', 'tags', 'targets', 'comments'],
        orderBy: 'id',
      });

      expect(a1.category).toMatchObject({ name: 'News' });
      expect(a2.category).toBeNull();
      expect(a1.tags.map((tag: { name: string }) => tag.name)).toEqual(['red']);
      expect(a2.tags).toEqual([]);
      expect(a1.targets.map((target: { name: string }) => target.name)).toEqual(['News']);
      expect(a1.comments).toEqual([]);
    });

    it('does not update or delete through a hidden target', async () => {
      const where = { category: { name: 'Old' } };

      await db.entityManager.updateMany(ARTICLE_UID, { where, data: { title: 'changed' } });
      await db.entityManager.deleteMany(ARTICLE_UID, { where });

      expect(await connection('articles').orderBy('id').pluck('title')).toEqual(['A1', 'A2', 'A3']);
      const writes = sqls.filter((sql) => /^(update|delete)/.test(sql));
      expect(writes).toHaveLength(2);
      // The scoped join stays in the nested select, so MySQL does not raise error 1093
      writes.forEach((sql) =>
        expect(sql).toMatch(
          /from \(select distinct `t0`\.`id` from `articles` as `t0` .*and exists \(select 1 from `categories` as `t3` where \(`t3`\.`id` = `t1`\.`category_id` and `t3`\.`deleted_at` is null\)\).*\) as `subQuery`\)$/
        )
      );
    });
  });

  it('does not recurse when a scope where names a relation', async () => {
    db.scopes.register({
      name: 'with-category',
      where: ({ uid }) => (uid === ARTICLE_UID ? { category: { id: { $notNull: true } } } : null),
    });
    db.scopes.register({
      name: 'categories-of-a3',
      where: ({ uid }) => (uid === CATEGORY_UID ? { articles: { title: 'A3' } } : null),
    });

    const rows = await db.entityManager.findMany(ARTICLE_UID, {});

    // Old does not link to A3, so the join scope hides the category of A2
    expect(titles(rows)).toEqual(['A1']);
    // Only the join to categories is scoped: its subquery joins articles with scopes off
    expect(sqls[0].match(/exists \(select/g)).toHaveLength(1);
  });

  it('binds the correlation to the outer column when a scope where names a relation', async () => {
    db.scopes.register({
      name: 'news-articles',
      where: ({ uid }) => (uid === ARTICLE_UID ? { category: { name: 'News' } } : null),
    });

    const rows = await db.entityManager.findMany(CATEGORY_UID, {
      where: { articles: { title: 'A3' } },
    });

    // A3 has no category, so its link to News matches nothing. A subquery that reused `t1` would
    // bind `t1`.`article_id` to its own link table and keep the link, because A1 is in News
    expect(rows).toEqual([]);
    expect(sqls[0]).toContain(
      'and exists (select distinct 1 from `articles` as `t3` ' +
        'left join `articles_category_lnk` as `t4` on `t3`.`id` = `t4`.`article_id` ' +
        'left join `categories` as `t5` on `t4`.`category_id` = `t5`.`id` ' +
        'where (`t3`.`id` = `t1`.`article_id` and `t5`.`name` = ?)) '
    );
  });
});
