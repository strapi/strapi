import type { Knex } from 'knex';

import { getOperationComment } from '../migrations/file-builder';

import type { Database } from '..';
import type {
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
 *   where the dialect supports it, so schema sync sees no diff afterwards. On
 *   other dialects sync drops and recreates them by name, which is safe.
 */

export type RenameSkipReason = 'source-missing' | 'target-exists';

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
   * Renames every index / constraint from the `pairs` list that exists on
   * `table`, when the dialect can do so in place. Returns silently otherwise.
   */
  const renameSchemaObjects = async (
    trx: Knex,
    table: string,
    pairs: Array<{ from: string; to: string }>
  ): Promise<void> => {
    if (!db.dialect.canRenameSchemaObjects()) {
      return;
    }

    for (const { from, to } of pairs) {
      if (from === to) {
        continue;
      }

      await db.dialect.renameSchemaObject(trx, { table, from, to });
    }
  };

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

      await renameSchemaObjects(trx, op.table, [
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

      await renameSchemaObjects(
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

      await tableOf(trx, op.table).where(op.where).update(op.set);

      logApplied(comment);
      return true;
    },
  };
};

export type RenameHelpers = ReturnType<typeof createRenameHelpers>;
