/**
 * Migration to convert all ID columns (primary keys and foreign keys) from INTEGER to BIGINT.
 *
 * This migration handles:
 * - Primary key columns (id) in all content type tables
 * - Foreign key columns in join tables (marked with internalIntegerId: true)
 * - Direct foreign key columns from relations with useJoinTable: false
 * - Proper handling of foreign key constraints (drop before, recreate after)
 *
 * Database-specific behavior:
 * - PostgreSQL: ALTER COLUMN TYPE BIGINT
 * - MySQL: MODIFY COLUMN BIGINT UNSIGNED (preserving nullability)
 * - SQLite: Skipped (INTEGER is already 64-bit)
 */
import type { Knex } from 'knex';

import debug from 'debug';
import type { Migration } from '../common';
import type { Database } from '../../index';
import type { ForeignKey } from '../../schema/types';
import type { Attribute } from '../../types';

const migrationDebug = debug('strapi::database::migration::bigint');

/**
 * Column that needs to be converted from INTEGER to BIGINT
 */
interface ColumnToConvert {
  table: string;
  column: string;
  isPrimaryKey: boolean;
}

/**
 * Collects all columns that need conversion from metadata.
 * Uses metadata as source of truth instead of DB introspection.
 */
const collectColumnsToConvert = async (knex: Knex, db: Database): Promise<ColumnToConvert[]> => {
  const columns: ColumnToConvert[] = [];

  for (const meta of db.metadata.values()) {
    const tableName = meta.tableName;
    const hasTable = await knex.schema.hasTable(tableName);

    if (hasTable === false) {
      migrationDebug(`Table ${tableName} does not exist, skipping`);
      continue;
    }

    for (const [attributeName, attribute] of Object.entries(meta.attributes)) {
      const attr = attribute as Attribute;

      // ID columns: identified by bigIncrements type in metadata
      // (metadata already uses bigIncrements, but DB may still be INTEGER)
      if (attr.type === 'bigincrements') {
        const columnName = attr.columnName ?? attributeName;
        columns.push({
          table: tableName,
          column: columnName,
          isPrimaryKey: true,
        });
        continue;
      }

      // FK columns in join tables: biginteger with internalIntegerId
      if (
        attr.type === 'biginteger' &&
        'internalIntegerId' in attr &&
        attr.internalIntegerId === true
      ) {
        const columnName = attr.columnName ?? attributeName;
        columns.push({
          table: tableName,
          column: columnName,
          isPrimaryKey: false,
        });
        continue;
      }

      // Direct FK columns: relation with joinColumn and owner
      if (
        attr.type === 'relation' &&
        'joinColumn' in attr &&
        attr.joinColumn !== undefined &&
        'owner' in attr &&
        attr.owner === true
      ) {
        const columnName = attr.joinColumn.name;
        // Only add if column actually exists in this table
        const hasColumn = await knex.schema.hasColumn(tableName, columnName);
        if (hasColumn) {
          columns.push({
            table: tableName,
            column: columnName,
            isPrimaryKey: false,
          });
        }
      }
    }
  }

  return columns;
};

/**
 * Collects foreign keys from metadata that reference tables being converted.
 */
const collectForeignKeysFromMetadata = (db: Database): (ForeignKey & { sourceTable: string })[] => {
  const foreignKeys: (ForeignKey & { sourceTable: string })[] = [];

  for (const meta of db.metadata.values()) {
    if (meta.foreignKeys === undefined || meta.foreignKeys.length === 0) {
      continue;
    }

    for (const fk of meta.foreignKeys) {
      foreignKeys.push({
        ...fk,
        // Add source table info for recreation
        sourceTable: meta.tableName,
      } as ForeignKey & { sourceTable: string });
    }
  }

  return foreignKeys;
};

/**
 * Check if a column is currently INTEGER type (needs conversion)
 */
const isIntegerColumn = async (
  knex: Knex,
  db: Database,
  tableName: string,
  columnName: string
): Promise<boolean> => {
  switch (db.dialect.client) {
    case 'postgres': {
      const schemaName = db.getSchemaName();
      const result = await knex.raw(
        `
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = ? 
          AND column_name = ?
          ${schemaName !== null ? 'AND table_schema = ?' : ''}
      `,
        schemaName !== null ? [tableName, columnName, schemaName] : [tableName, columnName]
      );

      const dataType = result.rows[0]?.data_type?.toLowerCase();
      return dataType === 'integer' || dataType === 'int' || dataType === 'int4';
    }

    case 'mysql': {
      const [result] = await knex.raw(
        `
        SELECT DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = ? 
          AND COLUMN_NAME = ?
          AND TABLE_SCHEMA = database()
      `,
        [tableName, columnName]
      );

      const dataType = result[0]?.DATA_TYPE?.toLowerCase();
      return dataType === 'int' || dataType === 'integer';
    }

    default:
      return false;
  }
};

/**
 * Get column nullability for MySQL (to preserve it during conversion)
 */
const isColumnNullable = async (
  knex: Knex,
  tableName: string,
  columnName: string
): Promise<boolean> => {
  const [result] = await knex.raw(
    `
    SELECT IS_NULLABLE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = ? 
      AND COLUMN_NAME = ?
      AND TABLE_SCHEMA = database()
  `,
    [tableName, columnName]
  );

  return result[0]?.IS_NULLABLE === 'YES';
};

/**
 * Convert a column from INTEGER to BIGINT
 */
const convertColumnToBigInt = async (
  knex: Knex,
  db: Database,
  tableName: string,
  columnName: string,
  isPrimaryKey: boolean
): Promise<void> => {
  migrationDebug(`Converting ${tableName}.${columnName} to BIGINT (isPK: ${isPrimaryKey})`);

  switch (db.dialect.client) {
    case 'postgres': {
      await knex.raw(`ALTER TABLE ?? ALTER COLUMN ?? TYPE BIGINT USING ??::BIGINT`, [
        tableName,
        columnName,
        columnName,
      ]);
      break;
    }

    case 'mysql': {
      if (isPrimaryKey) {
        await knex.raw(`ALTER TABLE ?? MODIFY COLUMN ?? BIGINT UNSIGNED NOT NULL AUTO_INCREMENT`, [
          tableName,
          columnName,
        ]);
      } else {
        // Preserve nullability for FK columns
        const isNullable = await isColumnNullable(knex, tableName, columnName);
        const nullConstraint = isNullable ? '' : ' NOT NULL';
        await knex.raw(`ALTER TABLE ?? MODIFY COLUMN ?? BIGINT UNSIGNED${nullConstraint}`, [
          tableName,
          columnName,
        ]);
      }
      break;
    }

    // SQLite: Skip - INTEGER is already 64-bit
    case 'sqlite':
      migrationDebug(
        `Skipping SQLite column ${tableName}.${columnName} - INTEGER is already 64-bit`
      );
      break;

    default:
      throw new Error(`Unsupported database dialect: ${db.dialect.client}`);
  }
};

/**
 * Drop all foreign keys that will be affected by the migration
 */
const dropForeignKeys = async (
  knex: Knex,
  db: Database,
  foreignKeys: (ForeignKey & { sourceTable: string })[]
): Promise<void> => {
  for (const fk of foreignKeys) {
    migrationDebug(`Dropping FK ${fk.name} from ${fk.sourceTable}`);

    if (db.dialect.client === 'postgres') {
      await knex.raw(`ALTER TABLE ?? DROP CONSTRAINT IF EXISTS ??`, [fk.sourceTable, fk.name]);
    } else if (db.dialect.client === 'mysql') {
      // MySQL: Check if FK exists before dropping
      const [exists] = await knex.raw(
        `
        SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_NAME = ? 
          AND TABLE_NAME = ? 
          AND TABLE_SCHEMA = database()
          AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      `,
        [fk.name, fk.sourceTable]
      );

      if (exists.length > 0) {
        await knex.raw(`ALTER TABLE ?? DROP FOREIGN KEY ??`, [fk.sourceTable, fk.name]);
      }
    }
  }
};

/**
 * Recreate all foreign keys after column conversion
 */
const recreateForeignKeys = async (
  knex: Knex,
  db: Database,
  foreignKeys: (ForeignKey & { sourceTable: string })[]
): Promise<void> => {
  for (const fk of foreignKeys) {
    migrationDebug(`Recreating FK ${fk.name} on ${fk.sourceTable}`);

    let sql = `ALTER TABLE ?? ADD CONSTRAINT ?? FOREIGN KEY (??) REFERENCES ?? (??)`;
    const params: string[] = [
      fk.sourceTable,
      fk.name,
      fk.columns[0],
      fk.referencedTable,
      fk.referencedColumns[0],
    ];

    if (fk.onDelete !== undefined && fk.onDelete !== null) {
      sql += ` ON DELETE ${fk.onDelete}`;
    }
    if (fk.onUpdate !== undefined && fk.onUpdate !== null) {
      sql += ` ON UPDATE ${fk.onUpdate}`;
    }

    await knex.raw(sql, params);
  }
};

/**
 * Main migration logic
 */
export const migrateIdsFromIntToBigInt: Migration = {
  name: '5.0.0-06-migrate-ids-from-int-to-bigint',

  async up(knex, db) {
    // SQLite: Skip entirely - INTEGER is already 64-bit
    if (db.dialect.client === 'sqlite') {
      migrationDebug('Skipping migration for SQLite - INTEGER is already 64-bit');
      return;
    }

    migrationDebug('Starting migration from INTEGER to BIGINT');

    // Collect columns to convert from metadata
    const columnsToConvert = await collectColumnsToConvert(knex, db);

    if (columnsToConvert.length === 0) {
      migrationDebug('No columns to convert');
      return;
    }

    migrationDebug(`Found ${columnsToConvert.length} columns to convert`);

    // Collect foreign keys from metadata
    const foreignKeys = collectForeignKeysFromMetadata(db) as (ForeignKey & {
      sourceTable: string;
    })[];

    // Filter to only columns that are actually INTEGER (not already BIGINT)
    const columnsNeedingConversion: ColumnToConvert[] = [];
    for (const col of columnsToConvert) {
      const needsConversion = await isIntegerColumn(knex, db, col.table, col.column);
      if (needsConversion) {
        columnsNeedingConversion.push(col);
      } else {
        migrationDebug(`Skipping ${col.table}.${col.column} - already BIGINT`);
      }
    }

    if (columnsNeedingConversion.length === 0) {
      migrationDebug('All columns already converted');
      return;
    }

    migrationDebug(`Converting ${columnsNeedingConversion.length} columns`);

    // Disable FK checks for MySQL
    if (db.dialect.client === 'mysql') {
      await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
    }

    try {
      // Drop foreign keys first (for Postgres, MySQL handles via FK_CHECKS)
      if (db.dialect.client === 'postgres') {
        await dropForeignKeys(knex, db, foreignKeys);
      }

      // Convert all columns - PKs first, then FKs
      const pkColumns = columnsNeedingConversion.filter((c) => c.isPrimaryKey);
      const fkColumns = columnsNeedingConversion.filter((c) => c.isPrimaryKey === false);

      for (const col of pkColumns) {
        await convertColumnToBigInt(knex, db, col.table, col.column, true);
      }

      for (const col of fkColumns) {
        await convertColumnToBigInt(knex, db, col.table, col.column, false);
      }

      // Recreate foreign keys (for Postgres, MySQL handles via FK_CHECKS)
      if (db.dialect.client === 'postgres') {
        await recreateForeignKeys(knex, db, foreignKeys);
      }

      migrationDebug('Migration completed successfully');
    } finally {
      // Re-enable FK checks for MySQL (always, even on error)
      if (db.dialect.client === 'mysql') {
        await knex.raw('SET FOREIGN_KEY_CHECKS = 1');
      }
    }
  },

  async down() {
    throw new Error('Down migration from BIGINT to INTEGER is not supported');
  },
};
