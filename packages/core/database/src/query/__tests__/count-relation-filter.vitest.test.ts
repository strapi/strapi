import knex from 'knex';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createEntityManager } from '../../entity-manager';
import { createMetadata } from '../../metadata';

/**
 * A filtered `count` over relation joins counts each stored row once.
 *
 * Strapi core's `entryMatches` (Content API writes) decides whether a caller may write a document by
 * counting its stored versions twice: with the caller's condition filters ANDed to the `documentId`,
 * and without them. The write is allowed when the two counts are equal, so every version matches.
 * Conditions on a to-many relation join it, and a joined version appears once per related row it
 * has. A plain `count(*)` would count a version with two matching owners twice, and the filtered
 * count could reach the unfiltered one while a version matches nothing, which allows a write the
 * caller may not make.
 *
 * What keeps the count right is `shouldUseDistinct` in the query builder, which turns the count
 * into `count(distinct t0.id)` as soon as the query joins. These tests pin that, in the SQL it
 * builds and in the numbers it gives, over the same entity manager `strapi.db.query(uid).count`
 * uses.
 */

interface JoinTable {
  name: string;
  joinColumn: { name: string };
  inverseJoinColumn: { name: string };
}

const USER = 'api::user.user';
const TAG = 'api::tag.tag';
const DOC = 'api::doc.doc';

const models = [
  {
    uid: USER,
    singularName: 'user',
    pluralName: 'users',
    tableName: 'users',
    attributes: { id: { type: 'increments' }, documentId: { type: 'string' } },
  },
  {
    uid: TAG,
    singularName: 'tag',
    pluralName: 'tags',
    tableName: 'tags',
    attributes: { id: { type: 'increments' }, name: { type: 'string' } },
  },
  {
    uid: DOC,
    singularName: 'doc',
    pluralName: 'docs',
    tableName: 'docs',
    attributes: {
      id: { type: 'increments' },
      documentId: { type: 'string' },
      status: { type: 'string' },
      owners: { type: 'relation', relation: 'manyToMany', target: USER },
      tags: { type: 'relation', relation: 'manyToMany', target: TAG },
    },
  },
];

/**
 * What is stored. Document `a1` has a draft (row 10) and a published version (row 11); `a2` is
 * another document the counts must leave out.
 *
 * | row | document | version   | owners   | tags    |
 * | --- | -------- | --------- | -------- | ------- |
 * | 10  | a1       | draft     | u1, u2   | x, y, z |
 * | 11  | a1       | published | u3       | y, z    |
 * | 12  | a2       | draft     | u1       | x       |
 */
const setUp = async () => {
  const connection = knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });

  const queries: string[] = [];

  connection.on('query', ({ sql }: { sql: string }) => queries.push(sql));

  const metadata = createMetadata(models as any);

  const db = {
    connection,
    metadata,
    getConnection: (table?: string) => (table ? connection(table) : connection),
    dialect: {
      client: 'sqlite',
      useReturning: () => false,
      transformErrors(error: Error) {
        throw error;
      },
    },
    lifecycles: { run: async () => undefined },
  } as any;

  // The join tables the metadata gives the two relations, which are what the queries join through
  const { owners, tags } = metadata.get(DOC).attributes as unknown as Record<
    'owners' | 'tags',
    { joinTable: JoinTable }
  >;

  await connection.schema.createTable('users', (t) => {
    t.increments('id');
    t.string('document_id');
  });
  await connection.schema.createTable('tags', (t) => {
    t.increments('id');
    t.string('name');
  });
  await connection.schema.createTable('docs', (t) => {
    t.increments('id');
    t.string('document_id');
    t.string('status');
  });

  for (const { joinTable } of [owners, tags]) {
    // eslint-disable-next-line no-await-in-loop
    await connection.schema.createTable(joinTable.name, (t) => {
      t.increments('id');
      t.integer(joinTable.joinColumn.name);
      t.integer(joinTable.inverseJoinColumn.name);
    });
  }

  await connection('users').insert([
    { id: 1, document_id: 'u1' },
    { id: 2, document_id: 'u2' },
    { id: 3, document_id: 'u3' },
  ]);
  await connection('tags').insert([
    { id: 1, name: 'x' },
    { id: 2, name: 'y' },
    { id: 3, name: 'z' },
  ]);
  await connection('docs').insert([
    { id: 10, document_id: 'a1', status: 'draft' },
    { id: 11, document_id: 'a1', status: 'published' },
    { id: 12, document_id: 'a2', status: 'draft' },
  ]);

  const link = (joinTable: JoinTable, rows: Array<[number, number]>) =>
    connection(joinTable.name).insert(
      rows.map(([doc, other]) => ({
        [joinTable.joinColumn.name]: doc,
        [joinTable.inverseJoinColumn.name]: other,
      }))
    );

  await link(owners.joinTable, [
    [10, 1],
    [10, 2],
    [11, 3],
    [12, 1],
  ]);
  await link(tags.joinTable, [
    [10, 1],
    [10, 2],
    [10, 3],
    [11, 2],
    [11, 3],
    [12, 1],
  ]);

  const em = createEntityManager(db);

  /** The count a write check asks for: the filter ANDed to the document, as `entryMatches` builds it */
  const countOf = (filter: Record<string, unknown> | null, documentId = 'a1') =>
    em.count(DOC, { where: filter === null ? { documentId } : { $and: [{ documentId }, filter] } });

  /** The count of the joined rows, which is what a count without `distinct` would give */
  const joinedRows = async (sql: string, ...bindings: string[]) => {
    const [{ c }] = (await connection.raw(sql, bindings)) as Array<{ c: number }>;

    return Number(c);
  };

  return {
    connection,
    queries,
    countOf,
    joinedRows,
    owners: owners.joinTable,
    tags: tags.joinTable,
  };
};

describe('a filtered count over relation joins (what entryMatches rests on)', () => {
  let ctx: Awaited<ReturnType<typeof setUp>>;

  beforeEach(async () => {
    ctx = await setUp();
  });

  afterEach(async () => {
    await ctx.connection.destroy();
  });

  /** The SQL of the last count the entity manager ran */
  const lastCount = () => ctx.queries.findLast((sql) => /count\(/i.test(sql)) as string;

  it('counts each version once when its relation rows match more than once', async () => {
    const { countOf, joinedRows, owners } = ctx;

    // The draft has both owners, so two joined rows match, and the published version none
    const filter = { owners: { documentId: { $in: ['u1', 'u2'] } } };

    // Fixture check: a count of the joined rows is 2, the number of versions the document has, so a
    // count without `distinct` would pass the draft off as both versions
    expect(
      await joinedRows(
        `select count(*) as c from docs t0
           left join ${owners.name} j on j.${owners.joinColumn.name} = t0.id
           left join users u on u.id = j.${owners.inverseJoinColumn.name}
           where t0.document_id = ? and u.document_id in ('u1', 'u2')`,
        'a1'
      )
    ).toBe(2);

    const all = await countOf(null);
    const matching = await countOf(filter);

    expect(all).toBe(2);
    // One version matches: the draft, once
    expect(matching).toBe(1);
    expect(matching).not.toBe(all);
  });

  it('counts each version once across two to-many relations, whose joined rows multiply', async () => {
    const { countOf, joinedRows, owners, tags } = ctx;

    // The draft matches through its owner u1 and through its tag x, over 2 owners and 3 tags
    const filter = {
      $or: [{ owners: { documentId: { $eq: 'u1' } } }, { tags: { name: { $eq: 'x' } } }],
    };

    expect(
      await joinedRows(
        `select count(*) as c from docs t0
           left join ${owners.name} j1 on j1.${owners.joinColumn.name} = t0.id
           left join users u on u.id = j1.${owners.inverseJoinColumn.name}
           left join ${tags.name} j2 on j2.${tags.joinColumn.name} = t0.id
           left join tags g on g.id = j2.${tags.inverseJoinColumn.name}
           where t0.document_id = ? and (u.document_id = 'u1' or g.name = 'x')`,
        'a1'
      )
    ).toBe(4);

    expect(await countOf(null)).toBe(2);
    expect(await countOf(filter)).toBe(1);
  });

  it('counts both versions when each of them matches, however many relation rows do', async () => {
    const { countOf } = ctx;

    // Three joined rows (u1 and u2 on the draft, u3 on the published version) over two versions
    const filter = { owners: { documentId: { $in: ['u1', 'u2', 'u3'] } } };

    const all = await countOf(null);
    const matching = await countOf(filter);

    expect(all).toBe(2);
    expect(matching).toBe(all);
  });

  it('counts none when no version matches, and leaves out the other documents', async () => {
    const { countOf } = ctx;

    expect(await countOf({ owners: { documentId: { $eq: 'nobody' } } })).toBe(0);

    // a2's draft belongs to u1 too, and a1 is the document asked for
    expect(await countOf({ owners: { documentId: { $eq: 'u1' } } })).toBe(1);
    expect(await countOf({ owners: { documentId: { $eq: 'u1' } } }, 'a2')).toBe(1);
    expect(await countOf(null, 'a2')).toBe(1);
    expect(await countOf(null, 'missing')).toBe(0);
  });

  it('builds count(distinct id) as soon as the filter joins, and a plain count when it does not', async () => {
    const { countOf } = ctx;

    await countOf({ owners: { documentId: { $eq: 'u1' } } });

    expect(lastCount()).toMatch(/left join/i);
    expect(lastCount()).toMatch(/count\(distinct `t0`\.`id`\)/i);

    await countOf({
      $or: [{ owners: { documentId: { $eq: 'u1' } } }, { tags: { name: { $eq: 'x' } } }],
    });

    expect(lastCount()).toMatch(/count\(distinct `t0`\.`id`\)/i);

    // No join: the rows of the root table are the versions, and nothing needs deduplicating
    await countOf({ status: { $eq: 'draft' } });

    expect(lastCount()).not.toMatch(/join/i);
    expect(lastCount()).not.toMatch(/distinct/i);
    expect(lastCount()).toMatch(/count\(`t0`\.`id`\)/i);
  });
});
