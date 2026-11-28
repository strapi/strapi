/**
 * Empties the test database of every table, so the next API file in the same jest process starts
 * from a database exactly like a fresh one. The migration files leave staged tables behind whose
 * index names (database-wide on SQLite) would make the next boot fail.
 */
import type { Knex } from 'knex';

import { inspectDatabase } from './users-permissions-project';

const dropAll = async (db: Knex): Promise<void> => {
  const client = String(db.client.config.client);

  if (client.includes('sqlite')) {
    // The pragma belongs to the connection (and is ignored inside a transaction); SQLite's pool
    // holds one
    const tables: Array<{ name: string }> = await db.raw(
      "select name from sqlite_master where type = 'table' and name not like 'sqlite_%'"
    );

    await db.raw('PRAGMA foreign_keys = OFF');

    try {
      for (const { name } of tables) {
        // eslint-disable-next-line no-await-in-loop
        await db.raw('drop table if exists ??', [name]);
      }
    } finally {
      await db.raw('PRAGMA foreign_keys = ON');
    }

    return;
  }

  if (client.includes('pg')) {
    // The app's own connection may name a schema (Strapi's `connection.schema`); the helper's does
    // not search it, so it is named here, and falls back to the current one
    const schema: string | undefined = (db.client.config.connection as { schema?: string })?.schema;
    const { rows } = await db.raw(
      'select tablename as name, schemaname as schema from pg_tables where schemaname = coalesce(?, current_schema())',
      [schema ?? null]
    );

    for (const row of rows) {
      // eslint-disable-next-line no-await-in-loop
      await db.raw('drop table if exists ??.?? cascade', [row.schema, row.name]);
    }

    return;
  }

  // MySQL: the setting is per connection, so every statement runs on one
  await db.transaction(async (trx) => {
    const [rows] = await trx.raw(
      'select table_name as name from information_schema.tables where table_schema = database() and table_type = ?',
      ['BASE TABLE']
    );

    await trx.raw('set foreign_key_checks = 0');

    try {
      for (const { name } of rows) {
        // eslint-disable-next-line no-await-in-loop
        await trx.raw('drop table if exists ??', [name]);
      }
    } finally {
      await trx.raw('set foreign_key_checks = 1');
    }
  });
};

export const resetDatabase = (): Promise<void> => inspectDatabase(dropAll);
