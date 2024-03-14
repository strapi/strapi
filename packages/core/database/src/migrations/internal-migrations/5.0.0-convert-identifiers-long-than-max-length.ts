import type { Knex } from 'knex';
import createDebug from 'debug';
import type { Migration } from '../common';
import type { Metadata } from '../../metadata';
import type { Database, MetadataOptions } from '../..';
import { getUnshortenedName } from '../../utils/identifiers/shortener';

const debug = createDebug('strapi::database::migration');

type NameDiff<T> = {
  short: T;
  full: T;
};

// TODO: key isn't really needed except for debugging, we can remove it
type IdentifierDiffs = {
  indexes: NameDiff<{ index: number; key: string; tableName: string; indexName: string }>[];
  tables: NameDiff<{ index: number; key: string; tableName: string }>[];
  columns: NameDiff<{ index: number; key: string; tableName: string; columnName: string }>[];
};

export const renameIdentifiersLongerThanMaxLength: Migration = {
  name: '5.0.0-rename-identifiers-longer-than-max-length',
  async up(knex, db) {
    const md = db.metadata;

    const maxLength = db.config?.settings?.maxIdentifierLength;
    if (maxLength === 0) {
      return;
    }

    if (maxLength === undefined) {
      throw new Error('Could not retrieve maxLength from db configuration');
    }

    const metadataOptions = {
      maxLength,
    };

    const diffs = findDiffs(md, metadataOptions);
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
        await knex.schema.table(tableName, async (table) => {
          const hasColumn = await knex.schema.hasColumn(tableName, full.columnName);

          if (hasColumn) {
            table.renameColumn(full.columnName, short.columnName);
          }
        });
      }
    }

    // migrate table names
    for (const tableDiff of diffs.tables) {
      const hasTable = await knex.schema.hasTable(tableDiff.full.tableName);

      if (hasTable) {
        await knex.schema.renameTable(tableDiff.full.tableName, tableDiff.short.tableName);
      }
    }
  },
  async down() {
    throw new Error('not implemented');
  },
};

type IndexDiff = NameDiff<{ index: number; key: string; tableName: string; indexName: string }>;

const renameIndex = async (knex: Knex, db: Database, diff: IndexDiff) => {
  const client = db.config.connection.client;
  const short = diff.short;
  const full = diff.full;

  if (full.indexName === short.indexName) {
    debug(`not renaming index ${full.indexName} because name hasn't changed`);
    return;
  }
  debug(`renaming index from ${full} to ${short}`);

  // If schema creation has never actually run before, none of these will exist, and they will throw an error
  // we have no way of running an "if exists" other than a per-dialect manual check, which we won't do
  // because even if it fails for some other reason, the schema sync will recreate them anyway
  // Therefore, we wrap this in a nested transaction (considering we are running this migration in a transaction)
  // so that we can suppress the error
  try {
    await knex.transaction(async (trx) => {
      if (client === 'mysql' || client === 'mariadb') {
        await trx.raw(
          `ALTER TABLE \`${full.tableName}\` RENAME INDEX \`${full.indexName}\` TO \`${short.indexName}\``
        );
      } else if (client === 'pg' || client === 'postgres') {
        await trx.raw(`ALTER INDEX "${full.indexName}" RENAME TO "${short.indexName}"`);
      } else if (client === 'sqlite' || client === 'better') {
        // SQLite doesn't support renaming, so we have to drop and recreate it
        await recreateIndexSqlite(trx, full.indexName, short.indexName);
      } else {
        debug('No db client name matches, not creating index');
      }
    });
  } catch (err) {
    debug(`error creating index: ${JSON.stringify(err)}`);
  }
};

// Select the definition of an index, drop it, and then recreate it
// That way, we do not reacreate from the model definition and potentially lose user modifications to it
const recreateIndexSqlite = async (knex: Knex, oldIndexName: string, newIndexName: string) => {
  if (oldIndexName === newIndexName) {
    debug(`not dropping and recreating index ${oldIndexName} because it hasn't changed`);
  }

  try {
    await knex.transaction(async (trx) => {
      // Get the CREATE INDEX statement used for this index
      const indexInfo = await trx
        .select('sql')
        .from('sqlite_master')
        .where('type', 'index')
        .andWhere('name', oldIndexName)
        .first();

      if (indexInfo && indexInfo.sql) {
        // Attempt to precisely target the index name in the CREATE INDEX statement
        const pattern = new RegExp(
          `(CREATE\\s+(UNIQUE\\s+)?INDEX\\s+(IF\\s+NOT\\s+EXISTS\\s+)?)${oldIndexName}(\\s+ON)`,
          'i'
        );
        const replacement = `$1${newIndexName}$4`;
        const newIndexSql = indexInfo.sql.replace(pattern, replacement);

        // Drop the existing index
        await trx.raw(`DROP INDEX IF EXISTS ??`, [oldIndexName]);

        // Recreate the index with a new name
        await trx.raw(newIndexSql);
      } else {
        debug(`sqlite index ${oldIndexName} not found or could not retrieve definition.`);
      }
    });
  } catch (err) {
    debug(`error recreating sqlite index${JSON.stringify(err)}`);
  }
};

const findDiffs = (shortMap: Metadata, options: MetadataOptions) => {
  const diffs = {
    tables: [],
    columns: [],
    indexes: [],
  } as IdentifierDiffs;

  const shortArr = Array.from(shortMap.entries());

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  shortArr.forEach(([key, shortObj], index) => {
    const fullTableName = getUnshortenedName(shortObj.tableName, options);
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
      const longColumnName = getUnshortenedName(shortColumnName, options);

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
      const longIndexName = getUnshortenedName(shortIndexName, options);
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
