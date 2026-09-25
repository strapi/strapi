import type { Knex } from 'knex';

import { getOperationComment } from '../migrations/file-builder';

import type { Database } from '..';
import type {
  AttributeRenamesOperation,
  RenameColumnOperation,
  RenameTableOperation,
  UpdateRowsOperation,
} from '../migrations/file-builder';

/**
 * Runtime helpers used by generated rename migrations (see
 * `migrations/file-builder.ts`). Keeping the guards, logging and dialect
 * specifics here instead of in the generated file means a fix in the database
 * package applies to migrations users already generated.
 *
 * Every helper:
 * - runs on the transaction it is given (never on `db.connection`, which may
 *   be exhausted by that very transaction on single-connection pools);
 * - checks the source exists and the target does not before doing anything,
 *   so it is a safe no-op on a fresh database (schema sync creates the tables
 *   afterwards) or on one that already moved on;
 * - logs when it skips: `info` when the source is missing (expected on a fresh
 *   database), `warn` when the target already exists (the environment drifted
 *   and the rename could not be applied — schema sync will then drop the old
 *   artifact, so this is worth a look);
 * - renames the indexes/constraints whose names embed the renamed identifier
 *   where the dialect supports it (Postgres), so schema sync sees no diff
 *   afterwards. On other dialects it drops them instead and schema sync
 *   re-creates them under the new name. Leaving them under the old name is not
 *   an option: sync only drops indexes it tracked on a table of the same name,
 *   so re-adding the old table/column later would collide with them.
 */

export type RenameSkipReason = 'source-missing' | 'target-exists';

/**
 * Attribute renames of one save, composed per model: `uid -> { origin: final }`.
 */
export interface AttributeRenames {
  renames: Record<string, Record<string, string>>;
  comment?: string;
}

/**
 * Updates a store keyed by attribute name (e.g. admin field permissions) for
 * the given renames. Runs inside the migration transaction `trx`.
 */
export type AttributeRenameHandler = (
  trx: Knex,
  renames: AttributeRenames['renames']
) => Promise<void>;

interface RenameHelpersDeps {
  db: Database;
}

export const createRenameHelpers = ({ db }: RenameHelpersDeps) => {
  const { identifiers } = db.metadata;

  const logSkip = (comment: string, detail: string, reason: RenameSkipReason): void => {
    const message = `[rename migration] skipped: ${comment} (${detail})`;
    if (reason === 'target-exists') {
      db.logger.warn(message);
    } else {
      db.logger.info(message);
    }
  };

  const logApplied = (comment: string): void => {
    db.logger.info(`[rename migration] applied: ${comment}`);
  };

  // A knex SchemaBuilder accumulates statements, so build a fresh one per call.
  const schemaOf = (trx: Knex) => db.getSchemaConnection(trx);
  const hasTable = (trx: Knex, table: string) => schemaOf(trx).hasTable(table);
  const hasColumn = (trx: Knex, table: string, column: string) =>
    schemaOf(trx).hasColumn(table, column);
  const tableOf = (trx: Knex, table: string) => {
    const schemaName = db.getSchemaName();
    return schemaName ? trx(table).withSchema(schemaName) : trx(table);
  };

  /**
   * Brings every index / constraint from the `pairs` list that exists on
   * `table` in line with a rename: renamed in place when the dialect can do so,
   * dropped otherwise (schema sync then re-creates it under the new name).
   */
  const syncSchemaObjectNames = async (
    trx: Knex,
    table: string,
    pairs: Array<{ from: string; to: string }>
  ): Promise<void> => {
    const canRename = db.dialect.canRenameSchemaObjects();

    for (const { from, to } of pairs) {
      if (from === to) {
        continue;
      }

      if (canRename) {
        await db.dialect.renameSchemaObject(trx, { table, from, to });
      } else {
        await db.dialect.dropSchemaObject(trx, { table, name: from });
      }
    }
  };

  const attributeRenameHandlers = new Set<AttributeRenameHandler>();

  return {
    /**
     * Renames a column, then the index / unique / foreign-key constraints named
     * after it (`<table>_<column>_index|unique|fk`) where supported.
     */
    async renameColumn(trx: Knex, op: RenameColumnOperation): Promise<boolean> {
      const comment = getOperationComment({ kind: 'renameColumn', ...op });

      if (!(await hasTable(trx, op.table))) {
        logSkip(comment, `table "${op.table}" does not exist`, 'source-missing');
        return false;
      }

      if (!(await hasColumn(trx, op.table, op.from))) {
        logSkip(comment, `column "${op.table}.${op.from}" does not exist`, 'source-missing');
        return false;
      }

      if (await hasColumn(trx, op.table, op.to)) {
        logSkip(comment, `column "${op.table}.${op.to}" already exists`, 'target-exists');
        return false;
      }

      await schemaOf(trx).alterTable(op.table, (table) => {
        table.renameColumn(op.from, op.to);
      });

      await syncSchemaObjectNames(trx, op.table, [
        {
          from: identifiers.getIndexName([op.table, op.from]),
          to: identifiers.getIndexName([op.table, op.to]),
        },
        {
          from: identifiers.getUniqueIndexName([op.table, op.from]),
          to: identifiers.getUniqueIndexName([op.table, op.to]),
        },
        {
          from: identifiers.getFkIndexName([op.table, op.from]),
          to: identifiers.getFkIndexName([op.table, op.to]),
        },
      ]);

      logApplied(comment);
      return true;
    },

    /**
     * Renames a table (typically a relation join table), then the indexes and
     * constraints named after it where supported.
     */
    async renameTable(trx: Knex, op: RenameTableOperation): Promise<boolean> {
      const comment = getOperationComment({ kind: 'renameTable', ...op });

      if (!(await hasTable(trx, op.from))) {
        logSkip(comment, `table "${op.from}" does not exist`, 'source-missing');
        return false;
      }

      if (await hasTable(trx, op.to)) {
        logSkip(comment, `table "${op.to}" already exists`, 'target-exists');
        return false;
      }

      await schemaOf(trx).renameTable(op.from, op.to);

      // Every name a join table's metadata derives from the table name (see
      // `createJoinTable` in metadata/relations.ts and the component link
      // tables in core's transform-content-types-to-models).
      const derived: Array<(name: string) => string> = [
        (name) => identifiers.getFkIndexName(name),
        (name) => identifiers.getInverseFkIndexName(name),
        (name) => identifiers.getUniqueIndexName(name),
        (name) => identifiers.getOrderFkIndexName(name),
        (name) => identifiers.getOrderInverseFkIndexName(name),
        (name) => identifiers.getOrderIndexName(name),
        (name) => identifiers.getIdColumnIndexName(name),
      ];

      await syncSchemaObjectNames(
        trx,
        op.to,
        derived.map((derive) => ({ from: derive(op.from), to: derive(op.to) }))
      );

      logApplied(comment);
      return true;
    },

    /**
     * Rewrites a stored value (e.g. the `field` or `component_type` column of a
     * component link table). Guarded on the table and `guardColumn` (defaults
     * to the first updated column) existing.
     */
    async updateRows(trx: Knex, op: UpdateRowsOperation): Promise<boolean> {
      const comment = getOperationComment({ kind: 'updateRows', ...op });
      const [firstSetColumn] = Object.keys(op.set);
      const guardColumn = op.guardColumn ?? firstSetColumn;

      if (!(await hasTable(trx, op.table))) {
        logSkip(comment, `table "${op.table}" does not exist`, 'source-missing');
        return false;
      }

      if (!(await hasColumn(trx, op.table, guardColumn))) {
        logSkip(comment, `column "${op.table}.${guardColumn}" does not exist`, 'source-missing');
        return false;
      }

      // Rows already carrying the target value are orphans (left behind when
      // an attribute with the target name was deleted earlier). Updating would
      // merge them into the renamed field and resurrect deleted content, so
      // they go first. Scope: every `where` key except the renamed column(s).
      const scope = Object.fromEntries(
        Object.entries(op.where).filter(([key]) => !(key in op.set))
      );
      const removed = await tableOf(trx, op.table)
        .where({ ...scope, ...op.set })
        .delete();
      if (removed > 0) {
        db.logger.info(
          `[rename migration] removed ${removed} orphan row(s) already matching ${JSON.stringify(op.set)} in "${op.table}" before: ${comment}`
        );
      }

      await tableOf(trx, op.table).where(op.where).update(op.set);

      logApplied(comment);
      return true;
    },

    /**
     * Registers a handler for `applyAttributeRenames`. Plugins that keep data
     * keyed by attribute name register one during their register phase, before
     * user migrations run. Returns a function that unregisters it.
     */
    registerAttributeRenameHandler(handler: AttributeRenameHandler): () => void {
      attributeRenameHandlers.add(handler);
      return () => {
        attributeRenameHandlers.delete(handler);
      };
    },

    /**
     * Dispatches one save's attribute renames to every registered handler, in
     * registration order, inside `trx`. The database package itself stores
     * nothing keyed by attribute name, so with no handler this is a no-op.
     */
    async applyAttributeRenames(trx: Knex, op: AttributeRenamesOperation): Promise<boolean> {
      const comment = getOperationComment({ kind: 'attributeRenames', ...op });

      if (attributeRenameHandlers.size === 0) {
        db.logger.debug(`[rename migration] skipped: ${comment} (no handler registered)`);
        return false;
      }

      for (const handler of [...attributeRenameHandlers]) {
        await handler(trx, op.renames);
      }

      logApplied(comment);
      return true;
    },
  };
};

export type RenameHelpers = ReturnType<typeof createRenameHelpers>;
