import type { Knex } from 'knex';

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
