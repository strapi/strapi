'use strict';

const reservedTableName = 'strapi_reserved_table_names';

/**
 * Finds all tables in the database that start with a prefix
 * @param {string} prefix
 * @returns {Array}
 */
const findTablesThatStartWithPrefix = async (prefix) => {
  const tables = await strapi.db.dialect.schemaInspector.getTables();
  return tables.filter((tableName) => tableName.startsWith(prefix));
};

/**
 * Check whether an entry exists in the DB for a reserved table name
 * If no entry does exist return the tableName to be added to the DB
 * @param {string} tableName
 * @returns {string|undefined}
 */
const doesReservedTableEntryExist = async (tableName) => {
  const rows = await strapi.db.getConnection()(reservedTableName).select().where('name', tableName);

  if (rows.length === 0) {
    return tableName;
  }
};

/**
 * Create entries in the DB for an array of reserved table names
 * @param {Array} tableNames
 */
const createReservedTableEntries = async (tableNames) =>
  strapi.db
    .getConnection()(reservedTableName)
    .insert(tableNames.map((tableName) => ({ name: tableName })));

/**
 * Create the DB table 'strapi_reserved_table_names' if it does not exist
 * @param {SchemaBuilder} connection to the strapi db
 */
const createReservedTable = async (connection) => {
  if (await connection.hasTable(reservedTableName)) {
    return;
  }
  return connection.createTable(reservedTableName, (table) => {
    table.increments('id');
    table.string('name');
  });
};

module.exports = {
  findTablesThatStartWithPrefix,
  doesReservedTableEntryExist,
  createReservedTableEntries,
  createReservedTable,
};
