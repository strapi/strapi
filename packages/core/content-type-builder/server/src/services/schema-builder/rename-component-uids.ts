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
 * The type column of a polymorphic relation (`MorphColumn` in `@strapi/database`).
 */
type MorphColumnMeta = { typeColumn?: { name?: string } };

/**
 * A metadata attribute, widened with the join-table and morph keys this module
 * inspects (the metadata union only declares them on some members).
 */
type AttributeMeta = ModelMeta['attributes'][string] & {
  relation?: string;
  joinTable?: { name?: string; pivotColumns?: string[]; morphColumn?: MorphColumnMeta };
  morphColumn?: MorphColumnMeta;
};

/**
 * A table column that stores a model uid, and therefore a component uid when the
 * model is a component.
 */
interface UIDColumn {
  tableName: string;
  column: string;
}

export interface ComponentUIDRename {
  oldUID: string;
  newUID: string;
}

/**
 * Collects the distinct table columns that can hold a component uid:
 * - `component_type` of the `*_cmps` join tables, which every `component` and
 *   `dynamiczone` attribute of a content type or a component points at;
 * - the type column of every polymorphic join table, e.g. `related_type` of upload's
 *   `files_related_mph`, which holds the uid of the component a media field lives in;
 * - the type column a `morphToOne` without join table keeps on its owner's table.
 *
 * Several attributes can share one table (every `media` attribute is the inverse of
 * `plugin::upload.file.related`), so the result is deduplicated.
 */
const getComponentUIDColumns = (db: Database): UIDColumn[] => {
  const columns = new Map<string, UIDColumn>();

  const add = (tableName: string | undefined, column: string | undefined) => {
    if (tableName && column) {
      columns.set(`${tableName}.${column}`, { tableName, column });
    }
  };

  for (const model of db.metadata.values()) {
    for (const attribute of Object.values(model.attributes ?? {}) as AttributeMeta[]) {
      const { joinTable } = attribute;

      if (joinTable?.pivotColumns?.includes(COMPONENT_TYPE_COLUMN)) {
        add(joinTable.name, COMPONENT_TYPE_COLUMN);
      }

      if (joinTable?.morphColumn) {
        add(joinTable.name, joinTable.morphColumn.typeColumn?.name);
      }

      if (attribute.relation === 'morphToOne' && !joinTable && attribute.morphColumn) {
        add(model.tableName, attribute.morphColumn.typeColumn?.name);
      }
    }
  }

  return Array.from(columns.values());
};

export interface RenameComponentUIDsOptions {
  /**
   * Runs after the rows are rewritten and before the transaction commits. If it
   * rejects, the transaction rolls the rows back and `renameComponentUIDs` rejects
   * with the same error. Use it for a later step that must succeed together with
   * the rows (e.g. the `groups.json` folder commit).
   *
   * It runs while the transaction holds a connection, so it must not use `db`: with
   * a pool of one connection (SQLite) a second query would wait forever. Without
   * renames it still runs, without a transaction.
   */
  beforeCommit?: () => Promise<unknown>;
}

/**
 * Rewrites every stored reference to a renamed component uid (category move or
 * category rename): the `component_type` of the component join rows and the type
 * column of the polymorphic rows, so the entries and their media keep resolving
 * after the reload. Runs in one transaction, which commits only after `beforeCommit`
 * resolves. Must run while `db.metadata` still describes the pre-rename schema: that
 * is what locates the tables.
 */
export const renameComponentUIDs = async (
  db: Database,
  renames: ComponentUIDRename[],
  { beforeCommit }: RenameComponentUIDsOptions = {}
) => {
  if (renames.length === 0) {
    await beforeCommit?.();
    return;
  }

  const columns = getComponentUIDColumns(db);

  await db.transaction(async ({ trx }) => {
    for (const { tableName, column } of columns) {
      for (const { oldUID, newUID } of renames) {
        await db
          .getConnection(tableName)
          .where(column, oldUID)
          .update({ [column]: newUID })
          .transacting(trx);
      }
    }

    // A rejection here rejects the callback, and `db.transaction` rolls the rows back.
    await beforeCommit?.();
  });
};
