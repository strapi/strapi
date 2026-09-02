import type { Knex } from 'knex';
import { snakeCase } from 'lodash/fp';

import { createdDocumentId } from '../5.0.0-02-document-id';

type InsertCall = { table: string; records: Array<{ id: number; document_id: string }> };
type OnConflictCall = { table: string; column: string };

const expectValidBackfill = (insertCalls: InsertCall[], expectedTotal: number) => {
  const allRecords = insertCalls.flatMap((call) => call.records);

  expect(allRecords).toHaveLength(expectedTotal);
  expect(insertCalls.every((call) => call.table === 'files')).toBe(true);
  expect(
    allRecords.every(
      (record) => typeof record.document_id === 'string' && record.document_id.length > 0
    )
  ).toBe(true);
  expect(new Set(allRecords.map((record) => record.document_id)).size).toBe(expectedTotal);
};

const expectUpsertOnId = (onConflictCalls: OnConflictCall[], expectedCount: number) => {
  expect(onConflictCalls).toHaveLength(expectedCount);
  expect(onConflictCalls.every((call) => call.table === 'files' && call.column === 'id')).toBe(
    true
  );
};

const buildHarness = (
  options: {
    existingColumns?: string[];
    rawAddColumnError?: Error;
    rowsNeedingBackfill?: number;
    client?: string;
  } = {}
) => {
  const existingColumns = new Set(options.existingColumns ?? []);
  const alterTableCalls: string[] = [];
  const insertCalls: InsertCall[] = [];
  const onConflictCalls: OnConflictCall[] = [];
  let remainingRowsToBackfill = options.rowsNeedingBackfill ?? 0;
  let nextId = 1;

  const knexBuilder: any = jest.fn((tableName: string) => {
    const builder: any = {
      count: jest.fn(() => ({
        whereNull: jest.fn(async () => [{ recordsLeft: remainingRowsToBackfill }]),
      })),
      select: jest.fn(() => ({
        whereNull: jest.fn(() => ({
          limit: jest.fn(async (limit: number) => {
            const batchCount = Math.min(remainingRowsToBackfill, limit);
            const rows = Array.from({ length: batchCount }, (_, index) => ({
              id: nextId + index,
            }));
            nextId += batchCount;
            return rows;
          }),
        })),
      })),
      insert: jest.fn((records: Array<{ id: number; document_id: string }>) => ({
        onConflict: jest.fn((column: string) => ({
          merge: jest.fn(async () => {
            onConflictCalls.push({ table: tableName, column });
            insertCalls.push({ table: tableName, records });
            remainingRowsToBackfill -= records.length;
            return records.length;
          }),
        })),
      })),
      update: jest.fn(() => builder),
      whereIn: jest.fn(() => Promise.resolve(0)),
      from: jest.fn(() => builder),
      whereNull: jest.fn(() => builder),
      limit: jest.fn(() => builder),
      as: jest.fn(() => builder),
    };
    return builder;
  });

  knexBuilder.client = { config: { client: options.client ?? 'postgres' } };

  knexBuilder.schema = {
    hasTable: jest.fn(async (tableName: string) => {
      return !tableName.endsWith('_localizations_links');
    }),
    hasColumn: jest.fn(async (tableName: string, column: string) => {
      if (column !== 'document_id') return false;
      return existingColumns.has(tableName);
    }),
    alterTable: jest.fn(async (tableName: string, tableBuilder: (t: any) => void) => {
      alterTableCalls.push(tableName);
      tableBuilder({ string: jest.fn() });
      if (options.rawAddColumnError) {
        existingColumns.add(tableName);
        throw options.rawAddColumnError;
      }
      existingColumns.add(tableName);
    }),
  };

  const db: any = {
    dialect: { client: 'postgres' },
    logger: {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    metadata: {
      values: () => [
        {
          tableName: 'files',
          singularName: 'file',
          attributes: { documentId: {} },
        },
      ],
    },
  };

  return {
    knex: knexBuilder as unknown as Knex.Transaction,
    db,
    get alterTableCalls() {
      return alterTableCalls;
    },
    get insertCalls() {
      return insertCalls;
    },
    get onConflictCalls() {
      return onConflictCalls;
    },
    get remainingRowsToBackfill() {
      return remainingRowsToBackfill;
    },
  };
};

describe('createdDocumentId migration — idempotent recovery (CMS-689)', () => {
  it('creates the column and backfills document_id on a fresh run', async () => {
    const h = buildHarness({ rowsNeedingBackfill: 2 });

    await expect(createdDocumentId.up(h.knex, h.db)).resolves.not.toThrow();

    expect(h.alterTableCalls).toEqual(['files']);
    expect(h.remainingRowsToBackfill).toBe(0);
    expectValidBackfill(h.insertCalls, 2);
    expectUpsertOnId(h.onConflictCalls, 1);
  });

  it('still backfills NULL document_id rows when the column already exists', async () => {
    const h = buildHarness({
      existingColumns: ['files'],
      rowsNeedingBackfill: 3,
    });

    await createdDocumentId.up(h.knex, h.db);

    expect(h.alterTableCalls).toEqual([]);
    expect(h.remainingRowsToBackfill).toBe(0);
    expectValidBackfill(h.insertCalls, 3);
    expectUpsertOnId(h.onConflictCalls, 1);
  });

  it('skips backfill when no rows need document_id', async () => {
    const h = buildHarness({
      existingColumns: ['files'],
      rowsNeedingBackfill: 0,
    });

    await createdDocumentId.up(h.knex, h.db);

    expect(h.alterTableCalls).toEqual([]);
    expect(h.insertCalls).toEqual([]);
    expect(h.onConflictCalls).toEqual([]);
  });

  it('tolerates Postgres 42701 "column already exists" during ADD COLUMN and still backfills', async () => {
    const duplicateColumnError = Object.assign(
      new Error('column "document_id" of relation "files" already exists'),
      { code: '42701' }
    );
    const h = buildHarness({
      rawAddColumnError: duplicateColumnError,
      rowsNeedingBackfill: 2,
    });

    await expect(createdDocumentId.up(h.knex, h.db)).resolves.not.toThrow();

    expect(h.alterTableCalls).toEqual(['files']);
    expect(h.remainingRowsToBackfill).toBe(0);
    expectValidBackfill(h.insertCalls, 2);
    expectUpsertOnId(h.onConflictCalls, 1);
  });

  it('tolerates MySQL 1060 "Duplicate column name" during ADD COLUMN', async () => {
    const duplicateColumnError = Object.assign(new Error("Duplicate column name 'document_id'"), {
      errno: 1060,
    });
    const h = buildHarness({
      rawAddColumnError: duplicateColumnError,
      rowsNeedingBackfill: 1,
    });

    await expect(createdDocumentId.up(h.knex, h.db)).resolves.not.toThrow();
    expect(h.remainingRowsToBackfill).toBe(0);
    expectValidBackfill(h.insertCalls, 1);
    expectUpsertOnId(h.onConflictCalls, 1);
  });

  it('rethrows non-duplicate-column errors during ADD COLUMN', async () => {
    const otherError = Object.assign(new Error('disk full'), { code: '53100' });
    const h = buildHarness({ rawAddColumnError: otherError });

    await expect(createdDocumentId.up(h.knex, h.db)).rejects.toThrow('disk full');
    expect(h.insertCalls).toEqual([]);
  });

  it('uses a smaller batch size on SQLite', async () => {
    const h = buildHarness({
      rowsNeedingBackfill: 300,
      client: 'sqlite3',
    });

    await createdDocumentId.up(h.knex, h.db);

    expect(h.remainingRowsToBackfill).toBe(0);
    expect(h.insertCalls.map((call) => call.records.length)).toEqual([250, 50]);
    expectValidBackfill(h.insertCalls, 300);
    expectUpsertOnId(h.onConflictCalls, 2);
  });

  it.each(['sqlite', 'sqlite3', 'better-sqlite3'])(
    'caps batch size at 250 for %s clients',
    async (client) => {
      const h = buildHarness({
        rowsNeedingBackfill: 251,
        client,
      });

      await createdDocumentId.up(h.knex, h.db);

      expect(h.insertCalls.map((call) => call.records.length)).toEqual([250, 1]);
      expectValidBackfill(h.insertCalls, 251);
    }
  );

  it('batches large backfills on postgres using the default batch size', async () => {
    const h = buildHarness({
      existingColumns: ['files'],
      rowsNeedingBackfill: 1500,
      client: 'postgres',
    });

    await createdDocumentId.up(h.knex, h.db);

    expect(h.insertCalls.map((call) => call.records.length)).toEqual([1000, 500]);
    expectValidBackfill(h.insertCalls, 1500);
    expectUpsertOnId(h.onConflictCalls, 2);
  });
});

describe('createdDocumentId migration — localized tables (union-find clustering)', () => {
  type Link = Record<string, number>;
  type UpdateCall = { id: number; document_id: string };

  const buildLocalizedHarness = (
    options: {
      tableName?: string;
      singularName?: string;
      pendingRows?: Array<{ id: number }>;
      links?: Link[];
      existingDocumentIds?: Record<number, string>;
      client?: string;
    } = {}
  ) => {
    const {
      tableName = 'categories',
      singularName = 'category',
      pendingRows = [],
      links = [],
      existingDocumentIds = {},
      client = 'postgres',
    } = options;

    const joinColumn = snakeCase(`${singularName}_id`);
    const inverseJoinColumn = snakeCase(`inv_${singularName}_id`);
    const joinTableName = snakeCase(`${tableName}_localizations_links`);

    const groupedUpdateCalls: Array<{ ids: number[]; document_id: string }> = [];
    const linkWhereInChunkSizes: number[] = [];

    const knexBuilder: any = jest.fn((table: string) => {
      if (table === joinTableName) {
        const conditions: Array<{ column: string; values: number[] }> = [];
        const builder: any = {
          select: jest.fn(() => builder),
          whereIn: jest.fn((column: string, chunk: number[]) => {
            linkWhereInChunkSizes.push(chunk.length);
            conditions.push({ column, values: chunk });
            return builder;
          }),
          orWhereIn: jest.fn((column: string, chunk: number[]) => {
            conditions.push({ column, values: chunk });
            return Promise.resolve(
              links.filter((link) => conditions.some((c) => new Set(c.values).has(link[c.column])))
            );
          }),
        };
        return builder;
      }

      if (table === tableName) {
        let selected = false;
        const builder: any = {
          select: jest.fn(() => {
            selected = true;
            return builder;
          }),
          whereNull: jest.fn(async () => pendingRows),
          whereIn: jest.fn((_column: string, ids: number[]) => {
            if (selected) {
              return Promise.resolve(
                ids
                  .filter((id) => existingDocumentIds[id] !== undefined)
                  .map((id) => ({ id, document_id: existingDocumentIds[id] }))
              );
            }
            return {
              update: jest.fn(async (data: { document_id: string }) => {
                groupedUpdateCalls.push({ ids: [...ids], document_id: data.document_id });
                return ids.length;
              }),
            };
          }),
        };
        return builder;
      }

      throw new Error(`Unexpected table access in test harness: ${table}`);
    });

    knexBuilder.client = { config: { client } };
    knexBuilder.schema = {
      hasTable: jest.fn(async () => true),
      hasColumn: jest.fn(async () => true),
      alterTable: jest.fn(),
    };

    const db: any = {
      dialect: { client },
      logger: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
      metadata: {
        values: () => [{ tableName, singularName, attributes: { documentId: {} } }],
      },
    };

    return {
      knex: knexBuilder as unknown as Knex.Transaction,
      db,
      get updateCalls(): UpdateCall[] {
        return groupedUpdateCalls.flatMap((group) =>
          group.ids.map((id) => ({ id, document_id: group.document_id }))
        );
      },
      get groupedUpdateCalls() {
        return groupedUpdateCalls;
      },
      get linkWhereInChunkSizes() {
        return linkWhereInChunkSizes;
      },
      joinColumn,
      inverseJoinColumn,
    };
  };

  const clusterByDocumentId = (updateCalls: UpdateCall[]) => {
    const byDocumentId = new Map<string, number[]>();
    for (const { id, document_id: documentId } of updateCalls) {
      const cluster = byDocumentId.get(documentId);
      if (cluster) {
        cluster.push(id);
      } else {
        byDocumentId.set(documentId, [id]);
      }
    }
    return [...byDocumentId.values()].map((ids) => ids.sort((a, b) => a - b));
  };

  it('assigns every row its own document_id when the link table has no rows (matches the pre-fix per-row result, in one pass instead of one query per row)', async () => {
    const h = buildLocalizedHarness({
      pendingRows: [{ id: 1 }, { id: 2 }, { id: 3 }],
      links: [],
    });

    await createdDocumentId.up(h.knex, h.db);

    expect(h.updateCalls).toHaveLength(3);
    const clusters = clusterByDocumentId(h.updateCalls);
    expect(clusters.sort()).toEqual([[1], [2], [3]]);
  });

  it('groups two directly linked rows under the same document_id', async () => {
    const h = buildLocalizedHarness({
      pendingRows: [{ id: 1 }, { id: 2 }, { id: 3 }],
      links: [{ [snakeCase('category_id')]: 1, [snakeCase('inv_category_id')]: 2 }],
    });

    await createdDocumentId.up(h.knex, h.db);

    const clusters = clusterByDocumentId(h.updateCalls).sort((a, b) => a[0] - b[0]);
    expect(clusters).toEqual([[1, 2], [3]]);
  });

  it('groups a transitive chain (A<->B, B<->C, no direct A<->C link) into a single document_id', async () => {
    const h = buildLocalizedHarness({
      pendingRows: [{ id: 1 }, { id: 2 }, { id: 3 }],
      links: [
        { [snakeCase('category_id')]: 1, [snakeCase('inv_category_id')]: 2 },
        { [snakeCase('category_id')]: 2, [snakeCase('inv_category_id')]: 3 },
      ],
    });

    await createdDocumentId.up(h.knex, h.db);

    const clusters = clusterByDocumentId(h.updateCalls);
    expect(clusters).toEqual([[1, 2, 3]]);
  });

  it('keeps multiple independent clusters separate', async () => {
    const h = buildLocalizedHarness({
      pendingRows: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      links: [
        { [snakeCase('category_id')]: 1, [snakeCase('inv_category_id')]: 2 },
        { [snakeCase('category_id')]: 3, [snakeCase('inv_category_id')]: 4 },
      ],
    });

    await createdDocumentId.up(h.knex, h.db);

    const clusters = clusterByDocumentId(h.updateCalls).sort((a, b) => a[0] - b[0]);
    expect(clusters).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('ignores links pointing at a genuinely missing id (no row, no document_id) — does not throw or merge into it', async () => {
    const h = buildLocalizedHarness({
      pendingRows: [{ id: 1 }, { id: 2 }],
      // 999 has no row with an existing document_id — must not throw or merge into it
      links: [{ [snakeCase('category_id')]: 1, [snakeCase('inv_category_id')]: 999 }],
    });

    await createdDocumentId.up(h.knex, h.db);

    const clusters = clusterByDocumentId(h.updateCalls).sort((a, b) => a[0] - b[0]);
    expect(clusters).toEqual([[1], [2]]);
  });

  describe('retry: mixed pending/already-migrated rows', () => {
    it('adopts an already-migrated direct sibling instead of minting a new document_id', async () => {
      const h = buildLocalizedHarness({
        pendingRows: [{ id: 1 }],
        // 2 already has a document_id — a retry after a partial prior run
        links: [{ [snakeCase('category_id')]: 1, [snakeCase('inv_category_id')]: 2 }],
        existingDocumentIds: { 2: 'doc-existing' },
      });

      await createdDocumentId.up(h.knex, h.db);

      expect(h.updateCalls).toEqual([{ id: 1, document_id: 'doc-existing' }]);
    });

    it('adopts the existing document_id when the pending row is on the inverse join column', async () => {
      const h = buildLocalizedHarness({
        pendingRows: [{ id: 2 }],
        // migrated hub (1) is on joinColumn, pending row (2) is on inverseJoinColumn
        links: [{ [snakeCase('category_id')]: 1, [snakeCase('inv_category_id')]: 2 }],
        existingDocumentIds: { 1: 'doc-existing' },
      });

      await createdDocumentId.up(h.knex, h.db);

      expect(h.updateCalls).toEqual([{ id: 2, document_id: 'doc-existing' }]);
    });

    it('propagates an existing document_id across a chain reached only through an already-migrated middle row (A-C via migrated B)', async () => {
      const h = buildLocalizedHarness({
        pendingRows: [{ id: 1 }, { id: 3 }],
        links: [
          { [snakeCase('category_id')]: 1, [snakeCase('inv_category_id')]: 2 },
          { [snakeCase('category_id')]: 2, [snakeCase('inv_category_id')]: 3 },
        ],
        existingDocumentIds: { 2: 'doc-existing' },
      });

      await createdDocumentId.up(h.knex, h.db);

      const clusters = clusterByDocumentId(h.updateCalls);
      expect(clusters).toEqual([[1, 3]]);
      expect(h.updateCalls.every((c) => c.document_id === 'doc-existing')).toBe(true);
    });

    it('handles leftover NULLs after a partial cluster write: one cluster adopts, an unrelated cluster still mints', async () => {
      const h = buildLocalizedHarness({
        pendingRows: [{ id: 1 }, { id: 3 }, { id: 4 }],
        links: [
          // cluster A: 1 (pending) <-> 2 (already migrated) — must adopt
          { [snakeCase('category_id')]: 1, [snakeCase('inv_category_id')]: 2 },
          // cluster B: 3 <-> 4, both still pending — must mint fresh, shared
          { [snakeCase('category_id')]: 3, [snakeCase('inv_category_id')]: 4 },
        ],
        existingDocumentIds: { 2: 'doc-existing' },
      });

      await createdDocumentId.up(h.knex, h.db);

      const byId = new Map(h.updateCalls.map((c) => [c.id, c.document_id]));
      expect(byId.get(1)).toBe('doc-existing');
      expect(byId.get(3)).toBe(byId.get(4));
      expect(byId.get(3)).not.toBe('doc-existing');
    });

    it('unifies onto one deterministic id when a cluster already carries more than one existing document_id', async () => {
      const h = buildLocalizedHarness({
        pendingRows: [{ id: 2 }],
        // an inconsistent prior partial write left 1 and 3 with two different ids
        links: [
          { [snakeCase('category_id')]: 1, [snakeCase('inv_category_id')]: 2 },
          { [snakeCase('category_id')]: 2, [snakeCase('inv_category_id')]: 3 },
        ],
        existingDocumentIds: { 1: 'doc-b', 3: 'doc-a' },
      });

      await createdDocumentId.up(h.knex, h.db);

      // deterministic: lexicographically smallest of the conflicting ids
      expect(h.updateCalls).toEqual([{ id: 2, document_id: 'doc-a' }]);
    });

    it('never overwrites a row that already has a document_id', async () => {
      const h = buildLocalizedHarness({
        pendingRows: [{ id: 1 }],
        links: [{ [snakeCase('category_id')]: 1, [snakeCase('inv_category_id')]: 2 }],
        existingDocumentIds: { 2: 'doc-existing' },
      });

      await createdDocumentId.up(h.knex, h.db);

      expect(h.updateCalls.some((c) => c.id === 2)).toBe(false);
    });
  });

  it('writes one whereIn per cluster instead of one update per row', async () => {
    const h = buildLocalizedHarness({
      pendingRows: [{ id: 1 }, { id: 2 }, { id: 3 }],
      links: [{ [snakeCase('category_id')]: 1, [snakeCase('inv_category_id')]: 2 }],
    });

    await createdDocumentId.up(h.knex, h.db);

    // cluster {1,2} + cluster {3} => 2 write calls, not 3
    expect(h.groupedUpdateCalls).toHaveLength(2);
    expect(h.updateCalls).toHaveLength(3);
  });

  it('fetches links in batches rather than a single unbounded whereIn (avoids exceeding the driver bound-parameter limit)', async () => {
    const pendingRows = Array.from({ length: 2500 }, (_, i) => ({ id: i + 1 }));
    const h = buildLocalizedHarness({
      pendingRows,
      links: [],
      client: 'postgres',
    });

    await createdDocumentId.up(h.knex, h.db);

    expect(h.linkWhereInChunkSizes).toEqual([1000, 1000, 500]);
    expect(h.updateCalls).toHaveLength(2500);
    // every row is its own cluster since there are no links
    expect(new Set(h.updateCalls.map((c) => c.document_id)).size).toBe(2500);
  });

  it('does nothing when there are no rows pending a document_id', async () => {
    const h = buildLocalizedHarness({ pendingRows: [], links: [] });

    await createdDocumentId.up(h.knex, h.db);

    expect(h.updateCalls).toEqual([]);
  });

  it('uses the smaller SQLite batch size (250) for link discovery, same as the non-localized path', async () => {
    const pendingRows = Array.from({ length: 260 }, (_, i) => ({ id: i + 1 }));
    const h = buildLocalizedHarness({
      pendingRows,
      links: [],
      client: 'sqlite3',
    });

    await createdDocumentId.up(h.knex, h.db);

    expect(h.linkWhereInChunkSizes).toEqual([250, 10]);
    expect(h.updateCalls).toHaveLength(260);
  });

  it('clusters and batches correctly on MySQL, same generic Knex calls as postgres/sqlite (batch size 1000, like postgres)', async () => {
    const pendingRows = Array.from({ length: 1200 }, (_, i) => ({ id: i + 1 }));
    // link every even id to the next odd id, forming 600 two-row clusters
    const links = [];
    for (let i = 1; i <= 1200; i += 2) {
      links.push({ [snakeCase('category_id')]: i, [snakeCase('inv_category_id')]: i + 1 });
    }
    const h = buildLocalizedHarness({
      pendingRows,
      links,
      client: 'mysql',
    });

    await createdDocumentId.up(h.knex, h.db);

    expect(h.linkWhereInChunkSizes).toEqual([1000, 200]);
    expect(h.updateCalls).toHaveLength(1200);
    const clusters = clusterByDocumentId(h.updateCalls);
    expect(clusters).toHaveLength(600);
    expect(clusters.every((cluster) => cluster.length === 2)).toBe(true);
  });
});
