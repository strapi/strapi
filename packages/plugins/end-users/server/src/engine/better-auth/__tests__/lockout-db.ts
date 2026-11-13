/**
 * A real database for the tests that sign in through the engine: the lockout counter is one SQL
 * statement against `eu_lockout_counters`, so it needs a database. Better Auth's own rate-limit table
 * is there too (`eu_rate_limits`), which the counter must never touch. SQLite in memory, through knex, with
 * the table laid out as Strapi lays out the generated rate-limit type (snake_case columns).
 */
import knex, { type Knex } from 'knex';

export interface LockoutDb {
  connection: Knex;
  /** The part of `strapi.db` the counter uses. */
  db: {
    connection: Knex;
    metadata: { get: (uid: string) => unknown };
    /** A user write, for the engine's revoke of old tokens: nothing is stored here. */
    query: (uid: string) => { updateMany: (params: unknown) => Promise<{ count: number }> };
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

  await connection.schema.createTable('eu_lockout_counters', (table) => {
    table.increments('id');
    table.string('document_id');
    table.string('key').notNullable().unique();
    table.integer('count').notNullable();
    table.bigInteger('last_request').notNullable();
  });

  await connection.schema.createTable('eu_rate_limits', (table) => {
    table.increments('id');
    table.string('document_id');
    table.string('key').notNullable().unique();
    table.integer('count').notNullable();
    table.bigInteger('last_request').notNullable();
  });

  const attributes = {
    documentId: { columnName: 'document_id' },
    key: { columnName: 'key' },
    count: { columnName: 'count' },
    lastRequest: { columnName: 'last_request' },
  };

  return {
    connection,
    db: {
      connection,
      query: () => ({ updateMany: async () => ({ count: 0 }) }),
      metadata: {
        get: (uid: string) => ({
          tableName: uid.endsWith('.rate-limit') ? 'eu_rate_limits' : 'eu_lockout_counters',
          attributes,
        }),
      },
    },
  };
};
