'use strict';

const { differenceWith, isEqual } = require('lodash/fp');

/**
 * Transform table name to the object format
 * @param {Array<string|{ table: string; dependsOn?: Array<{ table: string;}> }>} table
 * @returns Array<{ table: string; dependsOn?: Array<{ table: string;}> }>
 */
const transformTableName = (table) => {
  if (typeof table === 'string') {
    return { name: table };
  }
  return table;
};

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
 * @param {Array<string|{ table: string; dependsOn?: Array<{ table: string;}> }>} tableNames
 * @return {Promise<void>}
 */
async function addPersistTables({ strapi }, tableNames) {
  const persistedTables = await getPersistedTables({ strapi });
  const tables = tableNames.map(transformTableName);

  // Get new tables to be persisted, remove tables if they already were persisted
  const notPersistedTableNames = differenceWith(isEqual, tables, persistedTables);
  // Remove tables that are going to be changed
  const tablesToPersist = differenceWith(
    (t1, t2) => t1.name === t2.name,
    persistedTables,
    notPersistedTableNames
  );

  if (!notPersistedTableNames.length) {
    return;
  }

  tablesToPersist.push(...notPersistedTableNames);
  await strapi.store.set({
    type: 'core',
    key: 'persisted_tables',
    value: tablesToPersist,
  });
}

/**
 * Get all reserved table names from the core store
 * @param {Object} ctx
 * @param {Strapi} ctx.strapi
 * @param {RegExp} regex
 * @returns {Promise<string[]>}
 */

async function getPersistedTables({ strapi }) {
  const persistedTables = await strapi.store.get({
    type: 'core',
    key: 'persisted_tables',
  });

  return (persistedTables || []).map(transformTableName);
}

/**
 * Set all reserved table names in the core store
 * @param {Object} ctx
 * @param {Strapi} ctx.strapi
 * @param {Array<string|{ table: string; dependsOn?: Array<{ table: string;}> }>} tableNames
 * @returns {Promise<void>}
 */
async function setPersistedTables({ strapi }, tableNames) {
  await strapi.store.set({
    type: 'core',
    key: 'persisted_tables',
    value: tableNames,
  });
}
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
 * Remove all table names that end with a suffix from the reserved tables in core store
 * @param {string} tableNameSuffix
 * @return {Promise<void>}
 */
const removePersistedTablesWithSuffix = async (tableNameSuffix) => {
  const tableNameRegex = new RegExp(`.*${tableNameSuffix}$`);
  const persistedTables = await getPersistedTables({ strapi });

  const filteredPersistedTables = persistedTables.filter((table) => {
    return !tableNameRegex.test(table.name);
  });

  if (filteredPersistedTables.length === persistedTables.length) {
    return;
  }

  await setPersistedTables({ strapi }, filteredPersistedTables);
};

/**
 * Add tables to the reserved tables in core store
 * @param {Array<string|{ table: string; dependsOn?: Array<{ table: string;}> }} tables
 */
const persistTables = async (tables) => {
  await addPersistTables({ strapi }, tables);
};

module.exports = {
  persistTablesWithPrefix,
  removePersistedTablesWithSuffix,
  persistTables,
  findTables,
};
