/**
 * Migration to convert all ID columns (primary keys and foreign keys) from INTEGER to BIGINT.
 *
 * This migration handles:
 * - Primary key columns (id) in all content type tables
 * - Foreign key columns in join tables and relation tables
 * - Proper handling of foreign key constraints (drop before, recreate after)
 * - Database-specific conversion logic for MySQL, PostgreSQL, and SQLite
 *
 * Note: This migration must run BEFORE schema sync to avoid conflicts.
 */
import type { Knex } from 'knex';

import debug from 'debug';
import type { Migration } from '../common';
import type { Database } from '../../index';

const migrationDebug = debug('strapi::database::migration::bigint');

/**
 * Get all foreign keys that reference a specific column in a table
 */
const getForeignKeysReferencingColumn = async (
  knex: Knex,
  db: Database,
  tableName: string,
  columnName: string
): Promise<
  Array<{
    table: string;
    column: string;
    name: string;
    onDelete?: string;
    onUpdate?: string;
  }>
> => {
  switch (db.dialect.client) {
    case 'postgres': {
      const schemaName = db.getSchemaName();

      const query = `
        SELECT 
          tc.table_name as table,
          kcu.column_name as column,
          tc.constraint_name as name,
          rc.delete_rule as "onDelete",
          rc.update_rule as "onUpdate"
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
        JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
          AND tc.table_schema = rc.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = ?
          AND ccu.column_name = ?
          ${schemaName ? 'AND tc.table_schema = ?' : ''}
      `;

      const result = await knex.raw(
        query,
        schemaName ? [tableName, columnName, schemaName] : [tableName, columnName]
      );
      return result.rows;
    }

    case 'mysql': {
      const query = `
        SELECT 
          kcu.TABLE_NAME as \`table\`,
          kcu.COLUMN_NAME as \`column\`,
          kcu.CONSTRAINT_NAME as \`name\`,
          rc.DELETE_RULE as \`onDelete\`,
          rc.UPDATE_RULE as \`onUpdate\`
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
        JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
          ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
          AND kcu.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
        WHERE kcu.REFERENCED_TABLE_NAME = ?
          AND kcu.REFERENCED_COLUMN_NAME = ?
          AND kcu.TABLE_SCHEMA = database()
          AND kcu.REFERENCED_TABLE_SCHEMA = database()
      `;

      const [result] = await knex.raw(query, [tableName, columnName]);
      return result;
    }

    case 'sqlite': {
      // SQLite: Query all tables and check their foreign keys
      const tables = await knex.raw(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);

      const foreignKeys: Array<{
        table: string;
        column: string;
        name: string;
        onDelete?: string;
        onUpdate?: string;
      }> = [];

      for (const { name: table } of tables) {
        const fkInfo = await knex.raw(`PRAGMA foreign_key_list(${table})`);

        for (const fk of fkInfo) {
          if (fk.table === tableName && fk.to === columnName) {
            foreignKeys.push({
              table,
              column: fk.from,
              name: `fk_${table}_${fk.from}`,
              onDelete: fk.on_delete,
              onUpdate: fk.on_update,
            });
          }
        }
      }

      return foreignKeys;
    }

    default:
      return [];
  }
};

/**
 * Check if a column is an integer type (and not already bigint)
 */
const isIntegerColumn = async (
  knex: Knex,
  db: Database,
  tableName: string,
  columnName: string
): Promise<boolean> => {
  const schemaName = db.getSchemaName();

  switch (db.dialect.client) {
    case 'postgres': {
      const result = await knex.raw(
        `
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = ? 
          AND column_name = ?
          ${schemaName ? 'AND table_schema = ?' : ''}
      `,
        schemaName ? [tableName, columnName, schemaName] : [tableName, columnName]
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

    case 'sqlite': {
      const result = await knex.raw(`PRAGMA table_info(${tableName})`);
      const column = result.find((col: any) => col.name === columnName);
      const dataType = column?.type?.toLowerCase();
      return dataType === 'integer' || dataType === 'int';
    }

    default:
      return false;
  }
};

/**
 * Convert a column from INTEGER to BIGINT
 */
const convertColumnToBigInt = async (
  knex: Knex,
  db: Database,
  tableName: string,
  columnName: string,
  isPrimaryKey: boolean = false
): Promise<void> => {
  migrationDebug(`Converting ${tableName}.${columnName} to BIGINT`);

  switch (db.dialect.client) {
    case 'postgres': {
      // PostgreSQL: Use ALTER COLUMN with USING clause to convert data
      if (isPrimaryKey) {
        await knex.raw(`ALTER TABLE ?? ALTER COLUMN ?? TYPE BIGINT USING ??::BIGINT`, [
          tableName,
          columnName,
          columnName,
        ]);
      } else {
        await knex.raw(`ALTER TABLE ?? ALTER COLUMN ?? TYPE BIGINT USING ??::BIGINT`, [
          tableName,
          columnName,
          columnName,
        ]);
      }
      break;
    }

    case 'mysql': {
      // MySQL: Use MODIFY COLUMN
      if (isPrimaryKey) {
        await knex.raw(`ALTER TABLE ?? MODIFY COLUMN ?? BIGINT UNSIGNED NOT NULL AUTO_INCREMENT`, [
          tableName,
          columnName,
        ]);
      } else {
        await knex.raw(`ALTER TABLE ?? MODIFY COLUMN ?? BIGINT UNSIGNED`, [tableName, columnName]);
      }
      break;
    }

    case 'sqlite': {
      // SQLite: Requires table recreation due to limited ALTER TABLE support
      // This is complex, so we'll handle it by recreating the table
      await recreateTableWithBigInt(knex, tableName, columnName, isPrimaryKey);
      break;
    }

    default:
      migrationDebug(`Unsupported database dialect: ${db.dialect.client}`);
      break;
  }
};

/**
 * SQLite-specific: Recreate table with BIGINT column
 * SQLite doesn't support ALTER COLUMN, so we need to:
 * 1. Create new table with updated schema
 * 2. Copy data
 * 3. Drop old table
 * 4. Rename new table
 */
const recreateTableWithBigInt = async (
  knex: Knex,
  tableName: string,
  columnName: string,
  isPrimaryKey: boolean
): Promise<void> => {
  const tempTableName = `${tableName}_temp_bigint`;

  // Get table info
  const tableInfo = await knex.raw(`PRAGMA table_info(${tableName})`);

  // Build CREATE TABLE statement for temp table
  // Note: We need to quote column names to handle reserved keywords like "order"
  const columnDefs = tableInfo
    .map((col: any) => {
      const quotedName = `"${col.name}"`;
      if (col.name === columnName) {
        // Convert to BIGINT
        if (isPrimaryKey) {
          return `${quotedName} INTEGER PRIMARY KEY`;
        }
        return `${quotedName} INTEGER${col.notnull ? ' NOT NULL' : ''}${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''}`;
      }
      return `${quotedName} ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''}${col.pk && col.name !== columnName ? ' PRIMARY KEY' : ''}`;
    })
    .join(', ');

  // Create temp table
  await knex.raw(`CREATE TABLE "${tempTableName}" (${columnDefs})`);

  // Copy data - quote all identifiers
  const quotedColumnNames = tableInfo.map((col: any) => `"${col.name}"`).join(', ');
  await knex.raw(
    `INSERT INTO "${tempTableName}" (${quotedColumnNames}) SELECT ${quotedColumnNames} FROM "${tableName}"`
  );

  // Drop old table
  await knex.raw(`DROP TABLE "${tableName}"`);

  // Rename temp table
  await knex.raw(`ALTER TABLE "${tempTableName}" RENAME TO "${tableName}"`);

  // Note: Foreign keys and indexes need to be recreated by the calling code
};

/**
 * Main migration logic
 */
export const migrateIdsFromIntToBigInt: Migration = {
  name: '5.0.0-06-migrate-ids-from-int-to-bigint',

  async up(knex, db) {
    migrationDebug('Starting migration from INTEGER to BIGINT for all ID columns');

    // Disable foreign key checks during migration (database-specific)
    const disableForeignKeyChecks = async () => {
      switch (db.dialect.client) {
        case 'mysql':
          await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
          break;
        case 'sqlite':
          await knex.raw('PRAGMA foreign_keys = OFF');
          break;
        case 'postgres':
          break;
        default:
          throw new Error(`Unsupported database dialect: ${db.dialect.client}`);
        // PostgreSQL: We'll drop and recreate FKs manually
      }
    };

    const enableForeignKeyChecks = async () => {
      switch (db.dialect.client) {
        case 'mysql':
          await knex.raw('SET FOREIGN_KEY_CHECKS = 1');
          break;
        case 'sqlite':
          await knex.raw('PRAGMA foreign_keys = ON');
          break;
        case 'postgres':
          break;
        default:
          throw new Error(`Unsupported database dialect: ${db.dialect.client}`);
      }
    };

    try {
      await disableForeignKeyChecks();

      // Track foreign keys we need to recreate
      const droppedForeignKeys: Array<{
        table: string;
        column: string;
        name: string;
        referencedTable: string;
        referencedColumn: string;
        onDelete?: string;
        onUpdate?: string;
      }> = [];

      // Step 1: Convert all primary key columns
      for (const meta of db.metadata.values()) {
        const tableName = meta.tableName;
        const hasTable = await knex.schema.hasTable(tableName);

        if (!hasTable) {
          continue;
        }

        // Check if ID column exists and is integer
        const hasIdColumn = await knex.schema.hasColumn(tableName, 'id');
        if (!hasIdColumn) {
          continue;
        }

        const isInteger = await isIntegerColumn(knex, db, tableName, 'id');
        if (!isInteger) {
          migrationDebug(`Skipping ${tableName}.id - already BIGINT or not INTEGER`);
          continue;
        }

        migrationDebug(`Processing table: ${tableName}`);

        // Get all foreign keys referencing this table's ID
        const referencingFKs = await getForeignKeysReferencingColumn(knex, db, tableName, 'id');

        // Drop foreign keys referencing this column (for PostgreSQL and MySQL)
        if (db.dialect.client === 'postgres' || db.dialect.client === 'mysql') {
          for (const fk of referencingFKs) {
            migrationDebug(`Dropping FK ${fk.name} from ${fk.table}.${fk.column}`);
            try {
              if (db.dialect.client === 'postgres') {
                await knex.raw(`ALTER TABLE ?? DROP CONSTRAINT IF EXISTS ??`, [fk.table, fk.name]);
              } else if (db.dialect.client === 'mysql') {
                await knex.raw(`ALTER TABLE ?? DROP FOREIGN KEY ??`, [fk.table, fk.name]);
              }

              droppedForeignKeys.push({
                table: fk.table,
                column: fk.column,
                name: fk.name,
                referencedTable: tableName,
                referencedColumn: 'id',
                onDelete: fk.onDelete,
                onUpdate: fk.onUpdate,
              });
            } catch (error) {
              migrationDebug(
                `Error dropping FK ${fk.name}: ${error instanceof Error ? error.message : String(error)}`
              );
            }
          }
        }

        // Convert primary key column
        await convertColumnToBigInt(knex, db, tableName, 'id', true);

        // Convert foreign key columns in other tables that reference this PK
        for (const fk of referencingFKs) {
          const fkTableExists = await knex.schema.hasTable(fk.table);
          if (!fkTableExists) {
            continue;
          }

          const fkColumnIsInteger = await isIntegerColumn(knex, db, fk.table, fk.column);
          if (fkColumnIsInteger) {
            await convertColumnToBigInt(knex, db, fk.table, fk.column, false);
          }
        }
      }

      // Step 2: Recreate foreign keys for PostgreSQL and MySQL
      if (db.dialect.client === 'postgres' || db.dialect.client === 'mysql') {
        for (const fk of droppedForeignKeys) {
          migrationDebug(`Recreating FK ${fk.name} on ${fk.table}.${fk.column}`);
          try {
            let fkSQL = `ALTER TABLE ?? ADD CONSTRAINT ?? FOREIGN KEY (??) REFERENCES ?? (??)`;
            const fkParams: any[] = [
              fk.table,
              fk.name,
              fk.column,
              fk.referencedTable,
              fk.referencedColumn,
            ];

            // Add ON DELETE and ON UPDATE clauses if present
            if (fk.onDelete) {
              fkSQL += ` ON DELETE ${fk.onDelete.toUpperCase()}`;
            }
            if (fk.onUpdate) {
              fkSQL += ` ON UPDATE ${fk.onUpdate.toUpperCase()}`;
            }

            await knex.raw(fkSQL, fkParams);
          } catch (error) {
            migrationDebug(
              `Error recreating FK ${fk.name}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      }

      await enableForeignKeyChecks();

      migrationDebug('Migration completed successfully');
    } catch (error) {
      await enableForeignKeyChecks();
      throw error;
    }
  },

  async down() {
    throw new Error('Down migration from BIGINT to INTEGER is not supported');
  },
};
