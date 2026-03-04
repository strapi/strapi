import type { Knex } from 'knex';

import { addDocumentIdIndexes } from '../5.0.0-06-add-document-id-indexes';

describe('addDocumentIdIndexes migration', () => {
  it('adds document_id and composite indexes when columns exist', async () => {
    const indexCalls: Array<{ columns: string[]; name: string }> = [];

    const knex = {
      schema: {
        hasTable: jest.fn().mockResolvedValue(true),
        hasColumn: jest.fn().mockImplementation((_table: string, column: string) => {
          return ['document_id', 'locale', 'published_at'].includes(column);
        }),
        alterTable: jest.fn(async (_table: string, tableBuilder: (table: any) => void) => {
          const table = {
            index(columns: string[], name: string) {
              indexCalls.push({ columns, name });
            },
          };
          tableBuilder(table);
        }),
      },
    } as unknown as Knex.Transaction;

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
});
