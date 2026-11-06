/**
 * A real database for the tests that sign in through the engine: the lockout counter is one SQL
 * statement against `eu_rate_limits`, so it needs a database. SQLite in memory, through knex, with
 * the table laid out as Strapi lays out the generated rate-limit type (snake_case columns).
 */
// eslint-disable-next-line import/no-extraneous-dependencies, node/no-extraneous-import
import knex, { type Knex } from 'knex';

export interface LockoutDb {
  connection: Knex;
  /** The part of `strapi.db` the counter uses. */
  db: {
    connection: Knex;
    metadata: { get: (uid: string) => unknown };
  };
}

export const createLockoutDb = async (): Promise<LockoutDb> => {
  const connection = knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
    // One connection: an in-memory database exists once per connection
    pool: { min: 1, max: 1 },
  });

  await connection.schema.createTable('eu_rate_limits', (table) => {
    table.increments('id');
    table.string('document_id');
    table.string('key').notNullable().unique();
    table.integer('count').notNullable();
    table.bigInteger('last_request').notNullable();
  });

  return {
    connection,
    db: {
      connection,
      metadata: {
        get: () => ({
          tableName: 'eu_rate_limits',
          attributes: {
            documentId: { columnName: 'document_id' },
            key: { columnName: 'key' },
            count: { columnName: 'count' },
            lastRequest: { columnName: 'last_request' },
          },
        }),
      },
    },
  };
};
