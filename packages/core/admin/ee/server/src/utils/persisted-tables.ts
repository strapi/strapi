import type { Core } from '@strapi/types';
import { differenceWith, isEqual } from 'lodash/fp';

interface PersistedTable {
  name: string;
  dependsOn?: Array<{ name: string }>;
}

/**
 * Transform table name to the object format
 */
const transformTableName = (table: string | PersistedTable) => {
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
export async function findTables({ strapi }: { strapi: Core.Strapi }, regex: any) {
  // @ts-expect-error - getTables is not typed into the schema inspector
  const tables = await strapi.db.dialect.schemaInspector.getTables();
  return tables.filter((tableName: string) => regex.test(tableName));
}

/**
 * Add tables name to the reserved tables in core store
 */
async function addPersistTables(
  { strapi }: { strapi: Core.Strapi },
  tableNames: Array<string | PersistedTable>
) {
  const persistedTables = await getPersistedTables({ strapi });
  const tables = tableNames.map(transformTableName);

  // Get new tables to be persisted, remove tables if they already were persisted
  const notPersistedTableNames = differenceWith(isEqual, tables, persistedTables);
  // Remove tables that are going to be changed
  const tablesToPersist = differenceWith(
    (t1: any, t2: any) => t1.name === t2.name,
    persistedTables,
    notPersistedTableNames
  );

  if (!notPersistedTableNames.length) {
    return;
  }

  // @ts-expect-error lodash types
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

async function getPersistedTables({ strapi }: { strapi: Core.Strapi }) {
  const persistedTables: any = await strapi.store.get({
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
async function setPersistedTables(
  { strapi }: { strapi: Core.Strapi },
  tableNames: Array<string | PersistedTable>
) {
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

export const persistTablesWithPrefix = async (tableNamePrefix: string) => {
  const tableNameRegex = new RegExp(`^${tableNamePrefix}.*`);
  const tableNames = await findTables({ strapi }, tableNameRegex);

  await addPersistTables({ strapi }, tableNames);
};

/**
 * Remove all table names that end with a suffix from the reserved tables in core store
 * @param {string} tableNameSuffix
 * @return {Promise<void>}
 */
export const removePersistedTablesWithSuffix = async (tableNameSuffix: string) => {
  const tableNameRegex = new RegExp(`.*${tableNameSuffix}$`);
  const persistedTables = await getPersistedTables({ strapi });

  const filteredPersistedTables = persistedTables.filter((table: any) => {
    return !tableNameRegex.test(table.name);
  });

  if (filteredPersistedTables.length === persistedTables.length) {
    return;
  }

  await setPersistedTables({ strapi }, filteredPersistedTables);
};

/**
 * Add tables to the reserved tables in core store
 */
export const persistTables = async (tables: Array<string | PersistedTable>) => {
  await addPersistTables({ strapi }, tables);
};

export default {
  persistTablesWithPrefix,
  removePersistedTablesWithSuffix,
  persistTables,
  findTables,
};
