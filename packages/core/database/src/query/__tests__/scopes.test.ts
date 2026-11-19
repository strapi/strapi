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

const ARTICLE = 'api::article.article';
const CATEGORY = 'api::category.category';
const TAG = 'api::tag.tag';
const COMMENT = 'api::comment.comment';
const LINKS = 'articles_category_lnk';

const model = (singularName: string, pluralName: string, attributes: object) => ({
  uid: `api::${singularName}.${singularName}`,
  singularName,
  pluralName,
  tableName: pluralName,
  attributes: { id: { type: 'increments' }, ...attributes },
});

const models = [
  model('category', 'categories', {
    name: { type: 'string' },
    articles: { type: 'relation', relation: 'morphMany', target: ARTICLE, morphBy: 'targets' },
  }),
  model('tag', 'tags', { name: { type: 'string' } }),
  model('comment', 'comments', {
    body: { type: 'string' },
    owner: { type: 'relation', relation: 'morphToOne' },
  }),
  model('article', 'articles', {
    title: { type: 'string' },
    views: { type: 'integer' },
    category: { type: 'relation', relation: 'manyToOne', target: CATEGORY },
    section: { type: 'relation', relation: 'manyToOne', target: CATEGORY, useJoinTable: false },
    tags: { type: 'relation', relation: 'manyToMany', target: TAG },
    targets: { type: 'relation', relation: 'morphToMany' },
    comments: { type: 'relation', relation: 'morphMany', target: COMMENT, morphBy: 'owner' },
  }),
];

const MODEL_UIDS = new Set(models.map((model) => model.uid));

// Hides the soft-deleted rows of every model. deleted_at is a column but not an attribute, and
// join tables have none
const hideDeleted: QueryScope = {
  where: ({ uid }) => (MODEL_UIDS.has(uid) ? { deleted_at: null } : null),
};

const setup = async (connection: Knex) => {
  const metadata = createMetadata(models as unknown as Model[]);
  const modelTables = new Set(models.map((model) => model.tableName));

  for (const table of metadataToSchema(metadata).tables) {
    await connection.schema.createTable(table.name, (t) => {
      for (const { type, name } of table.columns) {
        // These models only map to these Knex column methods, none with args
        t[type as 'increments' | 'string' | 'integer' | 'double'](name);
      }

      if (modelTables.has(table.name)) {
        t.string('deleted_at');
      }
    });
  }

  const hidden = { deleted_at: '2026-01-01' };
  await connection('categories').insert([{ name: 'News' }, { name: 'Old', ...hidden }]);
  await connection('tags').insert([{ name: 'red' }, { name: 'yellow', ...hidden }]);
  await connection('articles').insert([
    { title: 'A1', views: 0 },
    { title: 'A2', views: 0, section_id: 2 },
    { title: 'A3', views: 0, ...hidden },
  ]);
  await connection('comments').insert([
    { body: 'c1', target_id: 1, target_type: ARTICLE, ...hidden },
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
    { article_id: 1, targets_id: 1, targets_type: CATEGORY, field: 'articles' },
    { article_id: 1, targets_id: 2, targets_type: CATEGORY, field: 'articles' },
    { article_id: 3, targets_id: 1, targets_type: CATEGORY, field: 'articles' },
  ]);

  // Stub with only the members the entity manager uses
  const db = {
    connection,
    metadata,
    config: { settings: {} },
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

describe('query scopes', () => {
  let connection: Knex;
  let db: Database;
  let em: Database['entityManager'];
  let sqls: string[];

  const titles = (rows: { title: string }[]) => rows.map((row) => row.title);
  const storedTitles = () => connection('articles').orderBy('id').pluck('title');
  const qb = (uid = ARTICLE) => em.createQueryBuilder(uid);
  const data = { title: 'changed' };
  const inNews = { category: { name: 'News' } };

  beforeEach(async () => {
    connection = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
      // A query that misses an open transaction waits for the one connection: fail fast
      acquireConnectionTimeout: 1000,
    });
    db = await setup(connection);
    em = db.entityManager;
    sqls = [];
    connection.on('query', ({ sql }) => sqls.push(sql));
  });

  afterEach(async () => {
    await connection.destroy();
  });

  it.each<[string, () => unknown, string[]]>([
    ['findMany', () => em.findMany(ARTICLE, {}), [`${ARTICLE} select`]],
    ['count', () => em.count(ARTICLE, {}), [`${ARTICLE} count`]],
    ['updateMany', () => em.updateMany(ARTICLE, { where: {}, data }), [`${ARTICLE} update`]],
    ['deleteMany', () => em.deleteMany(ARTICLE, { where: {} }), [`${ARTICLE} delete`]],
    ['a stream', () => qb().select('*').stream().toArray(), [`${ARTICLE} select`]],
    ['a lone increment', () => qb().increment('views').execute(), [`${ARTICLE} update`]],
    ['a lone decrement', () => qb().decrement('views').execute(), [`${ARTICLE} update`]],
    // Core reads and deletes relation links through a query builder on the join table
    ['a join-table select', () => qb(LINKS).select('*').execute(), [`${LINKS} select`]],
    ['a join-table delete', () => qb(LINKS).delete().execute(), [`${LINKS} delete`]],
    [
      'an updateMany with a join',
      () => em.updateMany(ARTICLE, { where: inNews, data }),
      [`${ARTICLE} update`, `${CATEGORY} select`],
    ],
    [
      'a deleteMany with a join',
      () => em.deleteMany(ARTICLE, { where: inNews }),
      [`${ARTICLE} delete`, `${CATEGORY} select`],
    ],
    ['an insert', () => qb().insert({ title: 'new' }).execute(), []],
    ['a max', () => qb().max('id').first().execute(), []],
    ['a min', () => qb().min('id').first().execute(), []],
    // The QueryBuilder has no truncate(): only the initial state sets the type
    [
      'a truncate',
      () => {
        createQueryBuilder(ARTICLE, db, { type: 'truncate' }).getKnexQuery();
      },
      [],
    ],
  ])('calls where for %s with the uid and query type', async (_, run, expected) => {
    const calls: string[] = [];
    db.unstable_scopes.register({
      where({ uid, type }) {
        calls.push(`${uid} ${type}`);
        return null;
      },
    });

    await run();

    expect(calls).toEqual(expected);
  });

  it.each<[string, QueryScope['where'], string]>([
    [
      'throws',
      () => {
        throw new Error('scope failed');
      },
      'scope failed',
    ],
    // @ts-expect-error a scope that forgets to return
    ['returns undefined', () => undefined, 'returned undefined'],
  ])('rejects the query before SQL when a scope %s', async (_, where, message) => {
    db.unstable_scopes.register({ where });

    await expect(em.findMany(ARTICLE, {})).rejects.toThrow(message);
    expect(sqls).toEqual([]);
  });

  it('builds the unscoped SQL when every scope returns null or is unregistered', async () => {
    await em.findMany(ARTICLE, {});
    db.unstable_scopes.register({ where: () => null });
    db.unstable_scopes.register(hideDeleted)();
    await em.findMany(ARTICLE, {});

    expect(sqls[1]).toBe(sqls[0]);
  });

  describe('with the test scope registered', () => {
    beforeEach(() => {
      db.unstable_scopes.register(hideDeleted);
    });

    it.each<[string, () => unknown, unknown, string]>([
      [
        'findMany',
        async () => titles(await em.findMany(ARTICLE, {})),
        ['A1', 'A2'],
        'select `t0`.* from `articles` as `t0` where (`t0`.`deleted_at` is null)',
      ],
      [
        'count',
        () => em.count(ARTICLE, {}),
        2,
        'select count(`t0`.`id`) as `count` from `articles` as `t0` where (`t0`.`deleted_at` is null) limit ?',
      ],
      [
        'updateMany',
        () => em.updateMany(ARTICLE, { where: {}, data }),
        { count: 2 },
        'update `articles` set `title` = ? where (`deleted_at` is null)',
      ],
      [
        'deleteMany',
        () => em.deleteMany(ARTICLE, { where: {} }),
        { count: 2 },
        'delete from `articles` where (`deleted_at` is null)',
      ],
      [
        'a lone increment',
        () => qb().increment('views').execute(),
        2,
        'update `articles` set `views` = `views` + ? where (`deleted_at` is null)',
      ],
      [
        'a lone decrement',
        () => qb().decrement('views').execute(),
        2,
        'update `articles` set `views` = `views` - ? where (`deleted_at` is null)',
      ],
    ])('scopes %s on the main table with no join', async (_, run, result, sql) => {
      expect(await run()).toEqual(result);
      expect(sqls).toEqual([sql]);
    });

    it.each([
      [
        'a join table',
        ARTICLE,
        { category: { name: 'Old' } },
        'select distinct `t0`.* from `articles` as `t0` ' +
          'left join `articles_category_lnk` as `t1` on `t0`.`id` = `t1`.`article_id` ' +
          'and exists (select 1 from `categories` as `t3` where (`t3`.`id` = `t1`.`category_id` and `t3`.`deleted_at` is null)) ' +
          'left join `categories` as `t2` on `t1`.`category_id` = `t2`.`id` ' +
          'where (`t2`.`name` = ? and `t0`.`deleted_at` is null)',
      ],
      [
        'a morph join table',
        CATEGORY,
        { articles: { title: 'A3' } },
        'select distinct `t0`.* from `categories` as `t0` ' +
          'left join `articles_targets_mph` as `t1` on `t0`.`id` = `t1`.`targets_id` ' +
          'and `t1`.`targets_type` = ? and `t1`.`field` = ? ' +
          'and exists (select 1 from `articles` as `t3` where (`t3`.`id` = `t1`.`article_id` and `t3`.`deleted_at` is null)) ' +
          'left join `articles` as `t2` on `t1`.`article_id` = `t2`.`id` ' +
          'where (`t2`.`title` = ? and `t0`.`deleted_at` is null)',
      ],
    ])('scopes the links of %s on the inverse join column', async (_, uid, where, sql) => {
      expect(await em.findMany(uid, { where })).toEqual([]);
      expect(sqls).toEqual([sql]);
    });

    it.each([
      ['a manyToMany', { tags: { name: 'yellow' } }],
      ['a join column', { section: { name: 'Old' } }],
      ['a morph column', { comments: { body: 'c1' } }],
    ])('reads a hidden target as no row in a filter through %s', async (_, where) => {
      expect(await em.findMany(ARTICLE, { where })).toEqual([]);
    });

    it.each([
      // Unscoped, Old sorts first. Scoped, it reads as null, which SQLite sorts last in desc
      ['a relation', { category: { name: 'desc' } }, ['A1', 'A2']],
      // Unscoped, A2 sorts on yellow. Scoped, it sorts on null, which SQLite puts first
      ['a deep manyToMany', { tags: { name: 'asc' } }, ['A2', 'A1']],
    ])('reads a hidden target as null in a sort on %s', async (_, orderBy, expected) => {
      expect(titles(await em.findMany(ARTICLE, { orderBy }))).toEqual(expected);
      // Aliases come after the join scope, so none repeats a subquery alias
      const aliases = sqls[0].match(/ as `t\d+`/g) ?? [];
      expect(aliases).toHaveLength(new Set(aliases).size);
    });

    it('does not match a $null filter through a link to a hidden target', async () => {
      // A1 links to red and to the hidden yellow, A2 only to yellow
      const where = { tags: { id: { $null: true } } };

      expect(titles(await em.findMany(ARTICLE, { where }))).toEqual(['A2']);
      expect(await em.count(ARTICLE, { where })).toBe(1);
      await em.deleteMany(ARTICLE, { where });
      expect(await storedTitles()).toEqual(['A1', 'A3']);
    });

    it('populates a hidden target as no row', async () => {
      const [a1, a2] = await em.findMany(ARTICLE, {
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

    it('writes through a visible join row and skips a hidden article on the same row', async () => {
      // A4 is hidden and in News, like A1
      await connection('articles').insert({ title: 'A4', views: 0, deleted_at: '2026-01-01' });
      await connection(LINKS).insert({ article_id: 4, category_id: 1 });

      await em.updateMany(ARTICLE, { where: inNews, data });
      expect(await storedTitles()).toEqual(['changed', 'A2', 'A3', 'A4']);

      await em.deleteMany(ARTICLE, { where: inNews });
      expect(await storedTitles()).toEqual(['A2', 'A3', 'A4']);
    });

    it('scopes the nested select of update and delete, joins included', async () => {
      const where = { category: { name: 'Old' } };

      await em.updateMany(ARTICLE, { where, data: { title: 'changed' } });
      await em.deleteMany(ARTICLE, { where });

      expect(await storedTitles()).toEqual(['A1', 'A2', 'A3']);
      const writes = sqls.filter((sql) => /^(update|delete)/.test(sql));
      expect(writes).toHaveLength(2);
      // The scoped join stays in the nested select, so MySQL does not raise error 1093
      writes.forEach((sql) =>
        expect(sql).toMatch(
          /from \(select distinct `t0`\.`id` from `articles` as `t0` .*and exists \(select 1 from `categories` as `t3` where \(`t3`\.`id` = `t1`\.`category_id` and `t3`\.`deleted_at` is null\)\).* and `t0`\.`deleted_at` is null\)\) as `subQuery`\)$/
        )
      );
    });
  });

  it('matches a write filter through a row that select sees but update hides', async () => {
    db.unstable_scopes.register({
      where: ({ uid, type }) =>
        uid === CATEGORY && type === 'update' ? { deleted_at: null } : null,
    });

    await em.updateMany(ARTICLE, {
      where: { category: { name: 'Old' } },
      data: { title: 'changed' },
    });

    expect(await storedTitles()).toEqual(['A1', 'changed', 'A3']);
  });

  it('does not recurse when a scope where names a relation', async () => {
    db.unstable_scopes.register({
      where: ({ uid }) => (uid === ARTICLE ? { category: { id: { $notNull: true } } } : null),
    });
    db.unstable_scopes.register({
      where: ({ uid }) => (uid === CATEGORY ? { articles: { title: 'A3' } } : null),
    });

    // Old does not link to A3, so the join scope hides the category of A2
    expect(titles(await em.findMany(ARTICLE, {}))).toEqual(['A1']);
    // Only the join to categories is scoped: its subquery joins articles with scopes off
    expect(sqls[0].match(/exists \(select/g)).toHaveLength(1);
  });

  it('binds the correlation to the outer column when a scope where names a relation', async () => {
    db.unstable_scopes.register({
      where: ({ uid }) => (uid === ARTICLE ? { category: { name: 'News' } } : null),
    });

    // A3 has no category, so its link to News matches nothing. A subquery that reused `t1` would
    // bind `t1`.`article_id` to its own link table and keep the link, because A1 is in News
    expect(await em.findMany(CATEGORY, { where: { articles: { title: 'A3' } } })).toEqual([]);
    expect(sqls[0]).toContain(
      'and exists (select distinct 1 from `articles` as `t3` ' +
        'left join `articles_category_lnk` as `t4` on `t3`.`id` = `t4`.`article_id` ' +
        'left join `categories` as `t5` on `t4`.`category_id` = `t5`.`id` ' +
        'where (`t3`.`id` = `t1`.`article_id` and `t5`.`name` = ?)) '
    );
  });

  describe('with a scope that names a relation', () => {
    const storedRows = () => connection('articles').orderBy('id').select('title', 'views');

    beforeEach(() => {
      db.unstable_scopes.register({ where: ({ uid }) => (uid === ARTICLE ? inNews : null) });
    });

    it('runs update and delete in the explicit transaction', async () => {
      const trx = await connection.transaction();
      const trxTitles = () => trx('articles').orderBy('id').pluck('title');

      await qb().transacting(trx).update(data).execute();
      expect(await trxTitles()).toEqual(['changed', 'A2', 'A3']);
      await qb().transacting(trx).delete().execute();
      expect(await trxTitles()).toEqual(['A2', 'A3']);
      await trx.rollback();

      expect(await storedTitles()).toEqual(['A1', 'A2', 'A3']);
    });

    it.each([
      ['an update with an increment', () => qb().update(data).increment('views', 2), 'changed', 2],
      ['a lone decrement', () => qb().decrement('views', 2), 'A1', -2],
    ])('applies %s on the outer update only', async (_, build, title, views) => {
      await build().execute();

      expect(sqls).toHaveLength(1);
      expect(sqls[0]).toMatch(/^update .* where `id` in \(select `id` from \(select distinct /);
      expect(await storedRows()).toEqual([
        { title, views },
        { title: 'A2', views: 0 },
        { title: 'A3', views: 0 },
      ]);
    });
  });
});
