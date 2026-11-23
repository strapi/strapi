import type { Knex } from 'knex';

import KnexBuilder from 'knex/lib/query/querybuilder';
import KnexRaw from 'knex/lib/raw';

import type { Database } from '..';

/**
 * @internal
 */
export function isKnexQuery(value: unknown): value is Knex.Raw | Knex.QueryBuilder {
  return value instanceof KnexBuilder || value instanceof KnexRaw;
}

/**
 * Applies the configured `settings.queryTimeout` (milliseconds) to a query so that the database
 * cancels it once the timeout elapses, instead of letting it run to completion while it holds a
 * pooled connection.
 *
 * A no-op when the setting is unset, or when the dialect cannot cancel queries (only the pg and
 * mysql knex clients can; knex throws when `{ cancel: true }` is used on any other client, and the
 * synchronous better-sqlite3 driver would never fire the timer anyway).
 *
 * @internal
 */
export function applyQueryTimeout<T extends Knex.Raw | Knex.QueryBuilder>(
  query: T,
  db: Database
): T {
  const { queryTimeout } = db.config.settings;

  if (queryTimeout === undefined || !canCancelQuery(db)) {
    return query;
  }

  return query.timeout(queryTimeout, { cancel: true }) as T;
}

const canCancelQuery = (db: Database) =>
  (db.connection.client as { canCancelQuery?: boolean }).canCancelQuery === true;

/**
 * Adds the name of the schema to the table name if the schema was defined by the user.
 * Users can set the db schema only for Postgres in strapi database config.
 */
export const addSchema = (db: Database, tableName: string): string => {
  const schemaName = db.getSchemaName();
  return schemaName ? `${schemaName}.${tableName}` : tableName;
};
