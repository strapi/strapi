'use strict';

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
 * Get all reserved table names from the core store
 * @returns {Array}
 */
const getReservedTables = async () =>
  strapi.store.get({
    type: 'core',
    key: 'reserved_tables',
  });

/**
 * Add all table names that start with a prefix to the reserved tables in
 * core store
 * @param {string} tableNamePrefix
 */
const reserveTablesWithPrefix = async (tableNamePrefix) => {
  const reservedTables = (await getReservedTables()) || [];

  const tableNames = await findTablesThatStartWithPrefix(tableNamePrefix);

  if (!tableNames.length) {
    return;
  }

  reservedTables.push(...tableNames.filter((name) => !reservedTables.includes(name)));

  await strapi.store.set({
    type: 'core',
    key: 'reserved_tables',
    value: reservedTables,
  });
};

module.exports = {
  reserveTablesWithPrefix,
  findTablesThatStartWithPrefix,
};
