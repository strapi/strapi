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
const getPersistedTables = async () =>
  (await strapi.store.get({
    type: 'core',
    key: 'persisted_tables',
  })) ?? [];

/**
 * Add all table names that start with a prefix to the reserved tables in
 * core store
 * @param {string} tableNamePrefix
 */

const persistTablesWithPrefix = async (tableNamePrefix) => {
  const persistedTables = (await getPersistedTables()) || [];
  const tableNames = await findTablesThatStartWithPrefix(tableNamePrefix);
  const notReservedTableNames = tableNames.filter((name) => !persistedTables.includes(name));

  if (!notReservedTableNames.length) {
    return;
  }

  persistedTables.push(...notReservedTableNames);
  await strapi.store.set({
    type: 'core',
    key: 'persisted_tables',
    value: persistedTables,
  });
};

module.exports = {
  persistTablesWithPrefix,
  findTablesThatStartWithPrefix,
};
