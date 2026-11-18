import knex from 'knex';
import type { Knex } from 'knex';
import { createEntityManager } from '../../entity-manager';
import { createMetadata } from '../../metadata';
import createQueryBuilder from '../query-builder';
import { createScopeRegistry } from '../scopes';
import type { QueryScope } from '../scopes';
import type { Database } from '../..';
import type { Model } from '../../types';
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
  where: ({ uid }) => (uid === ARTICLE_UID ? { deleted_at: null } : null),
};

// Stub with only the members the entity manager uses
const createDb = (connection: Knex, metadata: ReturnType<typeof createMetadata>) => {
  const db = {
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
      db.unstable_scopes.register(softDelete);
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
      db.unstable_scopes.register({
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
    db.unstable_scopes.register({ where: () => null });
    await db.entityManager.findMany(ARTICLE_UID, {});

    expect(sqls[1]).toBe(sqls[0]);
  });

  it('calls where with join-table names', async () => {
    const calls: Array<{ uid: string; type: string }> = [];
    db.unstable_scopes.register({
      where({ uid, type }) {
        calls.push({ uid, type });
        return null;
      },
    });

    // Core reads and deletes relation links through a query builder on the join table
    await db.entityManager.createQueryBuilder('articles_category_lnk').select('*').execute();
    await db.entityManager.createQueryBuilder('articles_category_lnk').delete().execute();

    expect(calls).toEqual([
      { uid: 'articles_category_lnk', type: 'select' },
      { uid: 'articles_category_lnk', type: 'delete' },
    ]);
  });

  it('passes the query type of the main table', async () => {
    const types: string[] = [];
    db.unstable_scopes.register({
      where({ type }) {
        types.push(type);
        return null;
      },
    });

    await db.entityManager.findMany(ARTICLE_UID, {});
    await db.entityManager.count(ARTICLE_UID, {});
    await db.entityManager.updateMany(ARTICLE_UID, { where: {}, data: { title: 'changed' } });
    await db.entityManager.deleteMany(ARTICLE_UID, { where: {} });
    await db.entityManager.createQueryBuilder(ARTICLE_UID).select('*').stream().toArray();

    expect(types).toEqual(['select', 'count', 'update', 'delete', 'select']);
  });

  it('scopes a lone increment and decrement as an update', async () => {
    const types: string[] = [];
    db.unstable_scopes.register({
      where({ uid, type }) {
        types.push(type);
        return uid === ARTICLE_UID ? { deleted_at: null } : null;
      },
    });

    await db.entityManager.createQueryBuilder(ARTICLE_UID).increment('views', 2).execute();
    await db.entityManager.createQueryBuilder(ARTICLE_UID).decrement('views').execute();

    expect(types).toEqual(['update', 'update']);
    expect(sqls).toEqual([
      'update `articles` set `views` = `views` + ? where (`deleted_at` is null)',
      'update `articles` set `views` = `views` - ? where (`deleted_at` is null)',
    ]);
    expect(await connection('articles').orderBy('id').pluck('views')).toEqual([1, 0]);
  });

  it('passes select for a join inside an update and a delete', async () => {
    const calls: Array<{ uid: string; type: string }> = [];
    db.unstable_scopes.register({
      where({ uid, type }) {
        calls.push({ uid, type });
        return null;
      },
    });
    const where = { category: { name: 'News' } };

    await db.entityManager.updateMany(ARTICLE_UID, { where, data: { title: 'changed' } });
    await db.entityManager.deleteMany(ARTICLE_UID, { where });

    expect(calls).toEqual([
      { uid: ARTICLE_UID, type: 'update' },
      { uid: CATEGORY_UID, type: 'select' },
      { uid: ARTICLE_UID, type: 'delete' },
      { uid: CATEGORY_UID, type: 'select' },
    ]);
  });

  it('does not call where for insert, truncate, max and min', async () => {
    const where = jest.fn(() => null);
    db.unstable_scopes.register({ where });

    await db.entityManager.createQueryBuilder(ARTICLE_UID).insert({ title: 'new' }).execute();
    await db.entityManager.createQueryBuilder(ARTICLE_UID).max('id').first().execute();
    await db.entityManager.createQueryBuilder(ARTICLE_UID).min('id').first().execute();
    // The QueryBuilder has no truncate(): only the initial state sets the type
    createQueryBuilder(ARTICLE_UID, db, { type: 'truncate' }).getKnexQuery();

    expect(where).not.toHaveBeenCalled();
  });

  it('rejects the query when where returns undefined', async () => {
    db.unstable_scopes.register({
      // @ts-expect-error a scope that forgets to return
      where() {},
    });

    await expect(db.entityManager.findMany(ARTICLE_UID, {})).rejects.toThrow('returned undefined');
    expect(sqls).toEqual([]);
  });

  it('removes the scope with the unregister function', async () => {
    const unregister = db.unstable_scopes.register(softDelete);
    unregister();

    expect(await db.entityManager.count(ARTICLE_UID, {})).toBe(2);
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
      db.unstable_scopes.register(hideDeleted);
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

  it('matches a write filter through a row that select sees but update hides', async () => {
    db.unstable_scopes.register({
      where: ({ uid, type }) =>
        uid === CATEGORY_UID && type === 'update' ? { deleted_at: null } : null,
    });

    await db.entityManager.updateMany(ARTICLE_UID, {
      where: { category: { name: 'Old' } },
      data: { title: 'changed' },
    });

    expect(await connection('articles').orderBy('id').pluck('title')).toEqual([
      'A1',
      'changed',
      'A3',
    ]);
  });

  it('does not recurse when a scope where names a relation', async () => {
    db.unstable_scopes.register({
      where: ({ uid }) => (uid === ARTICLE_UID ? { category: { id: { $notNull: true } } } : null),
    });
    db.unstable_scopes.register({
      where: ({ uid }) => (uid === CATEGORY_UID ? { articles: { title: 'A3' } } : null),
    });

    const rows = await db.entityManager.findMany(ARTICLE_UID, {});

    // Old does not link to A3, so the join scope hides the category of A2
    expect(titles(rows)).toEqual(['A1']);
    // Only the join to categories is scoped: its subquery joins articles with scopes off
    expect(sqls[0].match(/exists \(select/g)).toHaveLength(1);
  });

  it('binds the correlation to the outer column when a scope where names a relation', async () => {
    db.unstable_scopes.register({
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
