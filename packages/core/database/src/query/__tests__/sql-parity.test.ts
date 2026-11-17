import knex from 'knex';
import type { Knex } from 'knex';
import { createEntityManager } from '../../entity-manager';
import { createMetadata } from '../../metadata';
import { metadataToSchema } from '../../schema/schema';
import type { Database } from '../..';
import type { Model } from '../../types';

// A change to these snapshots is a change to the SQL that Strapi sends to the database

const ARTICLE_UID = 'api::article.article';
const CATEGORY_UID = 'api::category.category';
const TAG_UID = 'api::tag.tag';

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
    uid: ARTICLE_UID,
    singularName: 'article',
    pluralName: 'articles',
    tableName: 'articles',
    attributes: {
      id: { type: 'increments' },
      title: { type: 'string' },
      category: { type: 'relation', relation: 'manyToOne', target: CATEGORY_UID },
      tags: { type: 'relation', relation: 'manyToMany', target: TAG_UID },
      targets: { type: 'relation', relation: 'morphToMany' },
    },
  },
];

const setup = async (connection: Knex) => {
  // Model requires the morph joinTable, which createMetadata adds
  const metadata = createMetadata(models as unknown as Model[]);

  // Columns only: indexes and foreign keys do not change the SQL that queries build
  for (const table of metadataToSchema(metadata).tables) {
    await connection.schema.createTable(table.name, (t) => {
      for (const { type, name } of table.columns) {
        // These models only map to these Knex column methods, none with args
        t[type as 'increments' | 'string' | 'integer' | 'double'](name);
      }
    });
  }

  await connection('categories').insert([{ name: 'News' }, { name: 'Sport' }]);
  await connection('tags').insert([{ name: 'red' }, { name: 'blue' }]);
  await connection('articles').insert([{ title: 'A1' }, { title: 'A2' }, { title: 'A3' }]);
  await connection('articles_category_lnk').insert([
    { article_id: 1, category_id: 1 },
    { article_id: 2, category_id: 2 },
    { article_id: 3, category_id: 1 },
  ]);
  await connection('articles_tags_lnk').insert([
    { article_id: 1, tag_id: 1, tag_ord: 1 },
    { article_id: 1, tag_id: 2, tag_ord: 2 },
    { article_id: 2, tag_id: 2, tag_ord: 1 },
  ]);
  await connection('articles_targets_mph').insert([
    { article_id: 1, targets_id: 1, targets_type: CATEGORY_UID, field: 'targets', order: 1 },
    { article_id: 1, targets_id: 2, targets_type: TAG_UID, field: 'targets', order: 2 },
  ]);

  // Stub with only the members the entity manager uses
  const db = {
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
  } as unknown as Database;

  // Populate reads the entity manager from db
  db.entityManager = createEntityManager(db);
  return db.entityManager;
};

describe('SQL parity snapshot', () => {
  let connection: Knex;
  let em: ReturnType<typeof createEntityManager>;
  let statements: { sql: string; bindings: unknown[] }[];

  beforeEach(async () => {
    connection = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    em = await setup(connection);
    statements = [];
    // Populate runs extra queries at execute time that toSQL() does not show
    connection.on('query', ({ sql, bindings }) => statements.push({ sql, bindings }));
  });

  afterEach(async () => {
    await connection.destroy();
  });

  it('select with a relation filter', async () => {
    await em.findMany(ARTICLE_UID, { where: { category: { name: 'News' } } });
    expect(statements).toMatchSnapshot();
  });

  it('count with a relation filter', async () => {
    await em.count(ARTICLE_UID, { where: { tags: { name: 'blue' } } });
    expect(statements).toMatchSnapshot();
  });

  it('update with a relation filter', async () => {
    await em.updateMany(ARTICLE_UID, {
      where: { category: { name: 'News' } },
      data: { title: 'updated' },
    });
    expect(statements).toMatchSnapshot();
  });

  it('delete with a relation filter', async () => {
    await em.deleteMany(ARTICLE_UID, { where: { tags: { name: 'red' } } });
    expect(statements).toMatchSnapshot();
  });

  it('select with a deep sort on a relation field', async () => {
    await em.findMany(ARTICLE_UID, { orderBy: { category: { name: 'desc' } } });
    expect(statements).toMatchSnapshot();
  });

  it.each(['category', 'tags', 'targets'])('select with populate of %s', async (relation) => {
    await em.findMany(ARTICLE_UID, { populate: [relation] });
    expect(statements).toMatchSnapshot();
  });

  it('stream of a select', async () => {
    // Two rows fit in the first batch, so the stream runs one batch only
    await em
      .createQueryBuilder(ARTICLE_UID)
      .select('*')
      .where({ category: { name: 'News' } })
      .populate(['category'])
      .stream()
      .toArray();
    expect(statements).toMatchSnapshot();
  });
});
