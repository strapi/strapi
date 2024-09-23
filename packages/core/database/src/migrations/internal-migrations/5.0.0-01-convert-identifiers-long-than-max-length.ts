import type { Knex } from 'knex';
import createDebug from 'debug';
import type { Migration } from '../common';
import type { Metadata } from '../../metadata';
import { type Database } from '../..';
import { identifiers } from '../../utils/identifiers';

const debug = createDebug('strapi::database::migration');

type NameDiff<T> = {
  short: T;
  full: T;
};

type IndexDiff = NameDiff<{ index: number; key: string; tableName: string; indexName: string }>;

// key isn't really used except for debugging, but it's helpful to track down problems
type IdentifierDiffs = {
  indexes: IndexDiff[];
  tables: NameDiff<{ index: number; key: string; tableName: string }>[];
  columns: NameDiff<{ index: number; key: string; tableName: string; columnName: string }>[];
};

export const renameIdentifiersLongerThanMaxLength: Migration = {
  name: '5.0.0-rename-identifiers-longer-than-max-length',
  async up(knex, db) {
    const md = db.metadata;

    const diffs = findDiffs(md);
    // migrate indexes before tables so we know to target the original tableName
    for (const indexDiff of diffs.indexes) {
      await renameIndex(knex, db, indexDiff);
    }

    // migrate columns before table names so we know to target the original tableName
    for (const columnDiff of diffs.columns) {
      const { full, short } = columnDiff;
      const tableName = full.tableName;

      const hasTable = await knex.schema.hasTable(tableName);

      if (hasTable) {
        // tablebuilder methods MUST be synchronous and so you cannot use async inside it, which is why we check the column here
        const hasColumn = await knex.schema.hasColumn(tableName, full.columnName);

        if (hasColumn) {
          await knex.schema.alterTable(tableName, async (table) => {
            debug(`renaming column ${full.columnName} to ${short.columnName}`);
            table.renameColumn(full.columnName, short.columnName);
          });
        }
      }
    }

    // migrate table names
    for (const tableDiff of diffs.tables) {
      const hasTable = await knex.schema.hasTable(tableDiff.full.tableName);

      if (hasTable) {
        debug(`renaming table ${tableDiff.full.tableName} to ${tableDiff.short.tableName}`);
        await knex.schema.renameTable(tableDiff.full.tableName, tableDiff.short.tableName);
      }
    }
  },
  async down() {
    throw new Error('not implemented');
  },
};

const renameIndex = async (knex: Knex, db: Database, diff: IndexDiff) => {
  const client = db.config.connection.client;
  const short = diff.short;
  const full = diff.full;

  if (full.indexName === short.indexName) {
    debug(`not renaming index ${full.indexName} because name hasn't changed`);
    return;
  }

  // fk indexes can't be easily renamed, and will be recreated by db sync
  // if this misses something due to the loose string matching, it's not critical, it just means index will be rebuilt in db sync
  if (short.indexName.endsWith('fk') || full.indexName.endsWith('fk')) {
    return;
  }

  debug(`renaming index from ${full.indexName} to ${short.indexName}`);

  // If schema creation has never actually run before, none of these will exist, and they will throw an error
  // we have no way of running an "if exists" other than a per-dialect manual check, which we won't do
  // because even if it fails for some other reason, the schema sync will recreate them anyway
  // Therefore, we wrap this in a nested transaction (considering we are running this migration in a transaction)
  // so that we can suppress the error
  try {
    await knex.transaction(async (trx) => {
      if (client === 'mysql' || client === 'mariadb') {
        await knex
          .raw('ALTER TABLE ?? RENAME INDEX ?? TO ??', [
            full.tableName,
            full.indexName,
            short.indexName,
          ])
          .transacting(trx);
      } else if (client === 'pg' || client === 'postgres') {
        await knex
          .raw('ALTER INDEX ?? RENAME TO ??', [full.indexName, short.indexName])
          .transacting(trx);
      } else if (['sqlite', 'sqlite3', 'better-sqlite3'].includes(client as any)) {
        // SQLite doesn't support renaming, so rather than trying to drop/recreate we'll let db sync handle it
        debug(`SQLite does not support index renaming, not renaming index ${full.indexName}`);
      } else {
        debug(`No db client name matches, not renaming index ${full.indexName}`);
      }
    });
  } catch (err) {
    debug(`error creating index: ${JSON.stringify(err)}`);
  }
};

const findDiffs = (shortMap: Metadata) => {
  const diffs = {
    tables: [],
    columns: [],
    indexes: [],
  } as IdentifierDiffs;

  const shortArr = Array.from(shortMap.entries());

  shortArr.forEach(([, shortObj], index) => {
    const fullTableName = identifiers.getUnshortenedName(shortObj.tableName);
    if (!fullTableName) {
      throw new Error(`Missing full table name for ${shortObj.tableName}`);
    }

    // find table name diffs
    if (shortObj.tableName !== fullTableName) {
      diffs.tables.push({
        full: {
          index,
          key: 'tableName',
          tableName: fullTableName,
        },
        short: {
          index,
          key: 'tableName',
          tableName: shortObj.tableName,
        },
      });
    }

    // find column name diffs
    // eslint-disable-next-line guard-for-in
    for (const attrKey in shortObj.attributes) {
      if (shortObj.attributes[attrKey].type === 'relation') {
        continue;
      }

      // TODO: add more type checks so we don't need any
      const attr = shortObj.attributes[attrKey] as any;
      const shortColumnName = attr.columnName;
      const longColumnName = identifiers.getUnshortenedName(shortColumnName);

      if (!shortColumnName || !longColumnName) {
        throw new Error(`missing column name(s) for attribute ${JSON.stringify(attr, null, 2)}`);
      }
      if (shortColumnName && longColumnName && shortColumnName !== longColumnName) {
        diffs.columns.push({
          short: {
            index,
            tableName: fullTableName, // NOTE: this means that we must rename columns before tables
            key: `attributes.${attrKey}`,
            columnName: shortColumnName,
          },
          full: {
            index,
            tableName: fullTableName,
            key: `attributes.${attrKey}`,
            columnName: longColumnName,
          },
        });
      }
    }

    // find index name diffs
    // eslint-disable-next-line guard-for-in
    for (const attrKey in shortObj.indexes) {
      const shortIndexName = shortObj.indexes[attrKey].name;
      const longIndexName = identifiers.getUnshortenedName(shortIndexName);
      if (!longIndexName) {
        throw new Error(`Missing full index name for ${shortIndexName}`);
      }

      if (shortIndexName && longIndexName && shortIndexName !== longIndexName) {
        diffs.indexes.push({
          short: {
            index,
            tableName: fullTableName, // NOTE: this means that we must rename columns before tables
            key: `indexes.${attrKey}`,
            indexName: shortIndexName,
          },
          full: {
            index,
            tableName: fullTableName,
            key: `indexes.${attrKey}`,
            indexName: longIndexName,
          },
        });
      }
    }
  });

  return diffs;
};
