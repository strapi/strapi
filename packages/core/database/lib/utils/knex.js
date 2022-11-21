'use strict';

const KnexBuilder = require('knex/lib/query/querybuilder');
const KnexRaw = require('knex/lib/raw');

const isKnexQuery = (value) => {
  return value instanceof KnexBuilder || value instanceof KnexRaw;
};

/**
 * Adds the name of the schema to the table name if the schema was defined by the user.
 * Users can set the db schema only for Postgres in strapi database config.
 */
const addSchema = (tableName) => {
  const schemaName = strapi.db.connection.getSchemaName();
  return schemaName ? `${schemaName}.${tableName}` : tableName;
};

module.exports = {
  isKnexQuery,
  addSchema,
};
