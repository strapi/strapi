/* eslint-disable import/no-extraneous-dependencies, node/no-extraneous-import */
// knex and better-sqlite3 come with @strapi/database, which this package depends on
import createKnex from 'knex';
import type { Knex } from 'knex';
/* eslint-enable import/no-extraneous-dependencies, node/no-extraneous-import */

import type { Database } from '@strapi/database';
import { unsignRichtextAndBlocksUrls } from '../unsign-richtext-and-blocks-urls';

/**
 * Runs the column guard against a real knex on SQLite: the knex SchemaBuilder
 * is what decides whether a column exists, so a mock of it cannot catch a
 * misuse of the builder itself.
 */

const uid = 'api::article.article';

const contentTypes = {
  [uid]: {
    uid,
    attributes: {
      title: { type: 'string' },
      body: { type: 'richtext' },
      // Added in the same deploy as the upgrade: no column until the schema sync
      content: { type: 'blocks' },
    },
  },
};

describe('Upload | migrations | unsign-richtext-and-blocks-urls | SQLite', () => {
  let knex: Knex;

  beforeEach(async () => {
    knex = createKnex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });

    await knex.schema.createTable('articles', (table) => {
      table.increments('id');
      table.string('title');
      table.text('body');
    });
  });

  afterEach(async () => {
    await knex.destroy();
  });

  test('a reused SchemaBuilder reports a missing column as present', async () => {
    await knex.transaction(async (trx) => {
      const schema = trx.schema;

      expect(await schema.hasTable('articles')).toBe(true);
      // The builder queued hasTable too, so this resolves to an array of both results
      expect(await schema.hasColumn('articles', 'content')).toBeTruthy();

      expect(await trx.schema.hasColumn('articles', 'content')).toBe(false);
    });
  });

  test('only selects the columns that exist', async () => {
    const findMany = jest.fn(async () => []);

    global.strapi = {
      plugins: { upload: { provider: { isPrivate: jest.fn().mockResolvedValue(true) } } },
      contentTypes,
      components: {},
      db: { query: jest.fn(() => ({ findMany })) },
      log: { warn: jest.fn(), info: jest.fn() },
    } as any;

    const db = {
      metadata: {
        has: (key: string) => key === uid,
        get: () => ({
          tableName: 'articles',
          attributes: {
            title: { columnName: 'title' },
            body: { columnName: 'body' },
            content: { columnName: 'content' },
          },
        }),
      },
      getSchemaConnection: (trx: Knex.Transaction) => trx.schema,
    } as unknown as Database;

    await knex.transaction(async (trx) => {
      await unsignRichtextAndBlocksUrls.up(trx, db);
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ select: ['id', 'body'] }));
  });
});
