import type { Core } from '@strapi/types';

/**
 * The pivot column of every `*_cmps` join table that stores a component uid
 * (see `getComponentTypeColumn` in `@strapi/core`'s content type to model transform).
 */
const COMPONENT_TYPE_COLUMN = 'component_type';

/**
 * The database shapes this module reads, derived from `Core.Strapi` so the
 * Content-Type Builder does not depend on `@strapi/database` directly.
 */
type Database = Core.Strapi['db'];
type ModelMeta = NonNullable<ReturnType<Database['metadata']['get']>>;

/**
 * A metadata attribute, widened with the join-table keys this module inspects
 * (the metadata union only declares them on some members).
 */
type AttributeMeta = ModelMeta['attributes'][string] & {
  joinTable?: { name?: string; pivotColumns?: string[] };
};

export interface ComponentUIDRename {
  oldUID: string;
  newUID: string;
}

/**
 * Collects the distinct join tables carrying a `component_type` column: every
 * `component` and `dynamiczone` attribute of a content type or of a component
 * (nested components included) points at one.
 */
const getComponentJoinTableNames = (db: Database): string[] => {
  const tableNames = new Set<string>();

  for (const model of db.metadata.values()) {
    for (const attribute of Object.values(model.attributes ?? {}) as AttributeMeta[]) {
      const { joinTable } = attribute;

      if (joinTable?.name && joinTable.pivotColumns?.includes(COMPONENT_TYPE_COLUMN)) {
        tableNames.add(joinTable.name);
      }
    }
  }

  return Array.from(tableNames);
};

/**
 * Rewrites the `component_type` of every join row pointing at a renamed component
 * uid (category move or category rename) so the entries keep resolving after the
 * reload. Must run while `db.metadata` still describes the pre-rename schema: that
 * is what locates the tables.
 */
export const renameComponentUIDs = async (db: Database, renames: ComponentUIDRename[]) => {
  if (renames.length === 0) {
    return;
  }

  const tableNames = getComponentJoinTableNames(db);

  await db.transaction(async ({ trx }) => {
    for (const tableName of tableNames) {
      for (const { oldUID, newUID } of renames) {
        await db
          .getConnection(tableName)
          .where(COMPONENT_TYPE_COLUMN, oldUID)
          .update({ [COMPONENT_TYPE_COLUMN]: newUID })
          .transacting(trx);
      }
    }
  });
};
