import knex from 'knex';
import { createEntityManager } from '../../entity-manager';
import { createMetadata } from '../../metadata';

const TEST_UID = 'api::test.test';
const RELATED_UID = 'api::related.related';

const models = [
  {
    uid: RELATED_UID,
    singularName: 'related',
    pluralName: 'relateds',
    tableName: 'relateds',
    attributes: {
      id: { type: 'increments' },
      title: { type: 'string' },
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
      views: { type: 'integer' },
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
  });
  await connection.schema.createTable('tests', (t) => {
    t.increments('id');
    t.string('name');
    t.integer('views').defaultTo(0);
  });
  await connection.schema.createTable('tests_related_lnk', (t) => {
    t.increments('id');
    t.integer('test_id');
    t.integer('related_id');
  });
  await connection('relateds').insert([{ title: 'Category A' }, { title: 'Category B' }]);
  await connection('tests').insert([
    { id: 1, name: 'Hugo LLORIS', views: 10 },
    { id: 2, name: 'Samuel UMTITI', views: 10 },
    { id: 3, name: 'Lucas HERNANDEZ', views: 10 },
  ]);
  await connection('tests_related_lnk').insert([
    { test_id: 1, related_id: 1 },
    { test_id: 2, related_id: 2 },
    { test_id: 3, related_id: 1 },
  ]);
};

describe('increment/decrement with relation filter subquery', () => {
  it('increments only rows matching a nested relation where', async () => {
    const { db, connection } = makeDb();
    await setupTables(connection);
    const em = createEntityManager(db);

    await em
      .createQueryBuilder(TEST_UID)
      .init({ where: { related: { title: 'Category A' } } })
      .increment('views', 2)
      .execute();

    const rows = await connection('tests').orderBy('id').select('name', 'views');
    expect(rows).toEqual([
      { name: 'Hugo LLORIS', views: 12 },
      { name: 'Samuel UMTITI', views: 10 },
      { name: 'Lucas HERNANDEZ', views: 12 },
    ]);

    await connection.destroy();
  });

  it('decrements only rows matching a nested relation where', async () => {
    const { db, connection } = makeDb();
    await setupTables(connection);
    const em = createEntityManager(db);

    await em
      .createQueryBuilder(TEST_UID)
      .init({ where: { related: { title: 'Category A' } } })
      .decrement('views', 3)
      .execute();

    const rows = await connection('tests').orderBy('id').select('name', 'views');
    expect(rows).toEqual([
      { name: 'Hugo LLORIS', views: 7 },
      { name: 'Samuel UMTITI', views: 10 },
      { name: 'Lucas HERNANDEZ', views: 7 },
    ]);

    await connection.destroy();
  });
});
