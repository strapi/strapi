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
 * Adds the name of the schema to the table name if the schema was defined by the user.
 * Users can set the db schema only for Postgres in strapi database config.
 */
export const addSchema = (db: Database, tableName: string): string => {
  const schemaName = db.getSchemaName();
  return schemaName ? `${schemaName}.${tableName}` : tableName;
};
