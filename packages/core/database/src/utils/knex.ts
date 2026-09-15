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
 * Applies the configured `settings.queryTimeout` (milliseconds) to a query, cancelling
 * the underlying database query rather than letting it run to completion once the timeout
 * elapses. A no-op when the setting is unset, or when the query already has its own timeout.
 *
 * @internal
 */
export function applyDefaultQueryTimeout<T extends Knex.Raw | Knex.QueryBuilder>(
  query: T,
  db: Database
): T {
  const queryTimeout = db.config.settings.queryTimeout;

  if (!queryTimeout || (query as unknown as { _timeout?: number })._timeout) {
    return query;
  }

  return query.timeout(queryTimeout, { cancel: true }) as T;
}

/**
 * Adds the name of the schema to the table name if the schema was defined by the user.
 * Users can set the db schema only for Postgres in strapi database config.
 */
export const addSchema = (db: Database, tableName: string): string => {
  const schemaName = db.getSchemaName();
  return schemaName ? `${schemaName}.${tableName}` : tableName;
};
