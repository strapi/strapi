import type { Database, Migration } from '@strapi/database';

import { historyVersionSourceAndAuthor } from '../history-version-source-and-author';

const buildHarness = (options: { hasTable?: boolean; hasColumn?: boolean } = {}) => {
  const addedColumns: string[] = [];
  const update = jest.fn().mockResolvedValue(0);
  const whereNull = jest.fn(() => ({ update }));
  const knexBuilder = jest.fn(() => ({ whereNull }));

  const schema = {
    hasTable: jest.fn(async () => options.hasTable ?? true),
    hasColumn: jest.fn(async () => options.hasColumn ?? false),
    alterTable: jest.fn(async (_tableName: string, tableBuilder: (t: any) => void) => {
      tableBuilder({ string: (columnName: string) => addedColumns.push(columnName) });
    }),
  };

  const db = { getSchemaConnection: () => schema, getSchemaName: () => undefined };

  return {
    knex: knexBuilder as unknown as Parameters<Migration['up']>[0],
    db: db as unknown as Database,
    knexBuilder,
    schema,
    whereNull,
    update,
    addedColumns,
  };
};

describe('history version source and author migration', () => {
  it('does nothing on a fresh install', async () => {
    const h = buildHarness({ hasTable: false });

    await historyVersionSourceAndAuthor.up(h.knex, h.db);

    expect(h.schema.alterTable).not.toHaveBeenCalled();
    expect(h.knexBuilder).not.toHaveBeenCalled();
  });

  it('adds the source column and sets the admin panel source on the previous versions', async () => {
    const h = buildHarness();

    await historyVersionSourceAndAuthor.up(h.knex, h.db);

    expect(h.addedColumns).toEqual(['source']);
    expect(h.whereNull).toHaveBeenCalledWith('source');
    expect(h.update).toHaveBeenCalledWith({ source: 'admin-panel' });
  });

  it('only sets the source when the column already exists', async () => {
    const h = buildHarness({ hasColumn: true });

    await historyVersionSourceAndAuthor.up(h.knex, h.db);

    expect(h.schema.alterTable).not.toHaveBeenCalled();
    expect(h.update).toHaveBeenCalledWith({ source: 'admin-panel' });
  });
});
