import type { Knex } from 'knex';

import { createdDocumentId } from '../5.0.0-02-document-id';

type UpdateCall = { table: string; ids: number[] };

const buildHarness = (
  options: {
    existingColumns?: string[];
    rawAddColumnError?: Error;
    rowsNeedingBackfill?: number;
  } = {}
) => {
  const existingColumns = new Set(options.existingColumns ?? []);
  const alterTableCalls: string[] = [];
  const updateCalls: UpdateCall[] = [];
  let remainingRowsToBackfill = options.rowsNeedingBackfill ?? 0;

  const knexBuilder: any = jest.fn((tableName: string) => {
    const builder: any = {
      update: jest.fn(() => builder),
      whereIn: jest.fn((_column: string, ids: number[]) => {
        updateCalls.push({ table: tableName, ids });
        if (remainingRowsToBackfill > 0) {
          remainingRowsToBackfill -= 1;
          return Promise.resolve(1);
        }
        return Promise.resolve(0);
      }),
      select: jest.fn(() => builder),
      from: jest.fn(() => builder),
      whereNull: jest.fn(() => builder),
      limit: jest.fn(() => builder),
      as: jest.fn(() => builder),
    };
    return builder;
  });

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
    get updateCalls() {
      return updateCalls;
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
    expect(h.updateCalls.length).toBeGreaterThan(0);
  });

  it('still backfills NULL document_id rows when the column already exists', async () => {
    const h = buildHarness({
      existingColumns: ['files'],
      rowsNeedingBackfill: 3,
    });

    await createdDocumentId.up(h.knex, h.db);

    expect(h.alterTableCalls).toEqual([]);
    expect(h.remainingRowsToBackfill).toBe(0);
    expect(h.updateCalls.length).toBeGreaterThan(0);
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
  });

  it('rethrows non-duplicate-column errors during ADD COLUMN', async () => {
    const otherError = Object.assign(new Error('disk full'), { code: '53100' });
    const h = buildHarness({ rawAddColumnError: otherError });

    await expect(createdDocumentId.up(h.knex, h.db)).rejects.toThrow('disk full');
  });
});
