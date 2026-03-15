import type { Knex } from 'knex';

import { addDocumentIdIndexes } from '../5.0.0-06-add-document-id-indexes';

const createKnexMock = (columns: string[] = ['document_id', 'locale', 'published_at']) => {
  const indexCalls: Array<{ columns: string[]; name: string }> = [];
  const rawCalls: string[] = [];

  const knex = {
    schema: {
      hasTable: jest.fn().mockResolvedValue(true),
      hasColumn: jest.fn().mockImplementation((_table: string, column: string) => {
        return columns.includes(column);
      }),
      alterTable: jest.fn(async (_table: string, tableBuilder: (table: any) => void) => {
        const table = {
          index(cols: string[], name: string) {
            indexCalls.push({ columns: cols, name });
          },
        };
        tableBuilder(table);
      }),
    },
    raw: jest.fn().mockResolvedValue(undefined),
  } as unknown as Knex.Transaction;

  return { knex, indexCalls, rawCalls };
};

describe('addDocumentIdIndexes migration', () => {
  it('adds document_id and composite indexes when columns exist', async () => {
    const { knex, indexCalls } = createKnexMock();

    const db = {
      metadata: {
        values: () => [{ tableName: 'articles', attributes: {} }],
      },
    } as any;

    await addDocumentIdIndexes.up(knex, db);

    expect(indexCalls).toEqual(
      expect.arrayContaining([
        { columns: ['document_id'], name: 'articles_document_id_idx' },
        {
          columns: ['document_id', 'locale', 'published_at'],
          name: 'articles_document_id_locale_published_at_idx',
        },
      ])
    );
  });

  it('truncates index names exceeding 63 characters', async () => {
    const { knex, indexCalls } = createKnexMock();

    // A long table name that will produce index names > 63 chars
    const longTableName = 'strapi_transfer_token_permissions';

    const db = {
      metadata: {
        values: () => [{ tableName: longTableName, attributes: {} }],
      },
    } as any;

    await addDocumentIdIndexes.up(knex, db);

    // The composite index name would be 69 chars without truncation:
    // "strapi_transfer_token_permissions_document_id_locale_published_at_idx"
    for (const call of indexCalls) {
      expect(call.name.length).toBeLessThanOrEqual(63);
    }
  });

  it('uses savepoints around index creation', async () => {
    const { knex } = createKnexMock();

    const db = {
      metadata: {
        values: () => [{ tableName: 'articles', attributes: {} }],
      },
    } as any;

    await addDocumentIdIndexes.up(knex, db);

    const rawCalls = (knex.raw as jest.Mock).mock.calls.map((c) => c[0]);
    expect(rawCalls).toContain('SAVEPOINT create_idx');
    expect(rawCalls).toContain('RELEASE SAVEPOINT create_idx');
  });

  it('rolls back savepoint when index creation fails', async () => {
    const knex = {
      schema: {
        hasTable: jest.fn().mockResolvedValue(true),
        hasColumn: jest.fn().mockResolvedValue(true),
        alterTable: jest.fn().mockRejectedValue(new Error('relation already exists')),
      },
      raw: jest.fn().mockResolvedValue(undefined),
    } as unknown as Knex.Transaction;

    const db = {
      metadata: {
        values: () => [{ tableName: 'articles', attributes: {} }],
      },
    } as any;

    // Should not throw
    await addDocumentIdIndexes.up(knex, db);

    const rawCalls = (knex.raw as jest.Mock).mock.calls.map((c) => c[0]);
    expect(rawCalls).toContain('ROLLBACK TO SAVEPOINT create_idx');
  });
});
