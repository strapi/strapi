import type { Database, Migration } from '@strapi/database';

import type { AdminUser } from '../../origin/authors';
import { historyVersionSourceAndAuthor } from '../history-version-source-and-author';

const buildHarness = (
  options: { hasTable?: boolean; hasColumn?: boolean; adminUsers?: AdminUser[] } = {}
) => {
  const addedColumns: string[] = [];
  const update = jest.fn().mockResolvedValue(0);
  const whereNull = jest.fn(() => ({ update }));
  const where = jest.fn(() => ({ whereNull }));
  const select = jest.fn().mockResolvedValue(options.adminUsers ?? []);
  const knexBuilder = jest.fn((tableName: string) =>
    tableName === 'admin_users' ? { select } : { where, whereNull }
  );

  const schema = {
    hasTable: jest.fn(async () => options.hasTable ?? true),
    hasColumn: jest.fn(async () => options.hasColumn ?? false),
    alterTable: jest.fn(async (_tableName: string, tableBuilder: (t: any) => void) => {
      tableBuilder({ string: (columnName: string) => addedColumns.push(columnName) });
    }),
  };

  const db = {
    getSchemaConnection: () => schema,
    getSchemaName: () => undefined,
    metadata: { get: () => ({ tableName: 'admin_users' }) },
  };

  return {
    knex: knexBuilder as unknown as Parameters<Migration['up']>[0],
    db: db as unknown as Database,
    knexBuilder,
    schema,
    where,
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

  it('adds the new columns and sets the admin panel source on the previous versions', async () => {
    const h = buildHarness();

    await historyVersionSourceAndAuthor.up(h.knex, h.db);

    expect(h.schema.alterTable).toHaveBeenCalledTimes(1);
    expect(h.addedColumns).toEqual([
      'source',
      'author_type',
      'author_name',
      'author_model',
      'author_id',
    ]);
    expect(h.whereNull).toHaveBeenCalledWith('source');
    expect(h.update).toHaveBeenCalledWith({ source: 'admin-panel' });
  });

  it('only fills the columns when they already exist', async () => {
    const h = buildHarness({ hasColumn: true });

    await historyVersionSourceAndAuthor.up(h.knex, h.db);

    expect(h.schema.alterTable).not.toHaveBeenCalled();
    expect(h.update).toHaveBeenCalledWith({ source: 'admin-panel' });
  });

  it('sets the author of the previous versions of each admin user', async () => {
    const h = buildHarness({
      adminUsers: [
        { id: 1, username: 'kai', email: 'kai@test.com' },
        { id: 2, username: 'john', email: 'john@test.com' },
      ],
    });

    await historyVersionSourceAndAuthor.up(h.knex, h.db);

    expect(h.where).toHaveBeenNthCalledWith(1, 'created_by_id', 1);
    expect(h.update).toHaveBeenCalledWith({
      author_type: 'person',
      author_name: 'kai',
      author_model: 'admin::user',
      author_id: '1',
    });
    expect(h.where).toHaveBeenNthCalledWith(2, 'created_by_id', 2);
    expect(h.update).toHaveBeenCalledWith({
      author_type: 'person',
      author_name: 'john',
      author_model: 'admin::user',
      author_id: '2',
    });
  });
});
