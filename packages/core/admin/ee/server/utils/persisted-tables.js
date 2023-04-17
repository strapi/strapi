'use strict';

/**
 * Finds all tables in the database matching the regular expression
 * @param {Object} ctx
 * @param {Strapi} ctx.strapi
 * @param {RegExp} regex
 * @returns {Promise<string[]>}
 */
async function findTables({ strapi }, regex) {
  const tables = await strapi.db.dialect.schemaInspector.getTables();
  return tables.filter((tableName) => regex.test(tableName));
}

/**
 * Add tables name to the reserved tables in core store
 * @param {Object} ctx
 * @param {Strapi} ctx.strapi
 * @param  {string[]} tableNames
 * @return {Promise<void>}
 */
async function addPersistTables({ strapi }, tableNames) {
  const persistedTables = await getPersistedTables({ strapi });
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
}

/**
 * Get all reserved table names from the core store
 * @param {Object} ctx
 * @param {Strapi} ctx.strapi
 * @returns {Promise<string[]>}
 */
const getPersistedTables = async ({ strapi }) =>
  (await strapi.store.get({
    type: 'core',
    key: 'persisted_tables',
  })) ?? [];

/**
 * Add all table names that start with a prefix to the reserved tables in
 * core store
 * @param {string} tableNamePrefix
 * @return {Promise<void>}
 */

const persistTablesWithPrefix = async (tableNamePrefix) => {
  const tableNameRegex = new RegExp(`^${tableNamePrefix}.*`);
  const tableNames = await findTables({ strapi }, tableNameRegex);

  await addPersistTables({ strapi }, tableNames);
};

/**
 * Add all table names that end with a suffix to the reserved tables in core store
 * @param {string} tableNameSuffix
 * @return {Promise<void>}
 */
const persistTablesWithSuffix = async (tableNameSuffix) => {
  const tableNameRegex = new RegExp(`.*${tableNameSuffix}$`);
  const tableNames = await findTables({ strapi }, tableNameRegex);

  await addPersistTables({ strapi }, tableNames);
};

module.exports = {
  persistTablesWithPrefix,
  persistTablesWithSuffix,
  findTables,
};
