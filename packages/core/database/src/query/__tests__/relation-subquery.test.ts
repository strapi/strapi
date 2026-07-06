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
  });
  await connection.schema.createTable('tests_related_lnk', (t) => {
    t.increments('id');
    t.integer('test_id');
    t.integer('related_id');
  });
  await connection('relateds').insert([{ title: 'Category A' }, { title: 'Category B' }]);
  await connection('tests').insert([
    { id: 1, name: 'Hugo LLORIS' },
    { id: 2, name: 'Samuel UMTITI' },
    { id: 3, name: 'Lucas HERNANDEZ' },
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
});
