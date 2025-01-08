import { isNil, prop, omit, castArray } from 'lodash/fp';
import createDebug from 'debug';

import type { Knex } from 'knex';
import type { Database } from '..';
import type { Schema, Table, SchemaDiff, TableDiff, ForeignKey, Index, Column } from './types';

const debug = createDebug('strapi::database');

export default (db: Database) => {
  const helpers = createHelpers(db);

  return {
    /**
     * Returns a knex schema builder instance
     * @param {string} table - table name
     */
    getSchemaBuilder(trx: Knex.Transaction) {
      return db.getSchemaConnection(trx);
    },

    /**
     * Creates schema in DB
     */
    async createSchema(schema: Schema) {
      await db.connection.transaction(async (trx) => {
        await this.createTables(schema.tables, trx);
      });
    },

    /**
     * Creates a list of tables in a schema
     * @param {KnexInstance} trx
     * @param {Table[]} tables
     */
    async createTables(tables: Table[], trx: Knex.Transaction) {
      for (const table of tables) {
        debug(`Creating table: ${table.name}`);
        const schemaBuilder = this.getSchemaBuilder(trx);
        await helpers.createTable(schemaBuilder, table);
      }

      // create FKs once all the tables exist
      for (const table of tables) {
        debug(`Creating table foreign keys: ${table.name}`);
        const schemaBuilder = this.getSchemaBuilder(trx);
        await helpers.createTableForeignKeys(schemaBuilder, table);
      }
    },
    /**
     * Drops schema from DB
     */
    async dropSchema(schema: Schema, { dropDatabase = false } = {}) {
      if (dropDatabase) {
        // TODO: drop database & return as it will drop everything
        return;
      }

      await db.connection.transaction(async (trx) => {
        for (const table of schema.tables.reverse()) {
          const schemaBuilder = this.getSchemaBuilder(trx);
          await helpers.dropTable(schemaBuilder, table);
        }
      });
    },

    /**
     * Applies a schema diff update in the DB
     * @param {*} schemaDiff
     */
    // TODO: implement force option to disable removal in DB
    async updateSchema(schemaDiff: SchemaDiff['diff']) {
      const forceMigration = db.config.settings?.forceMigration;

      await db.dialect.startSchemaUpdate();

      // Pre-fetch metadata for all updated tables
      const existingMetadata: Record<string, { indexes: Index[]; foreignKeys: ForeignKey[] }> = {};
      for (const table of schemaDiff.tables.updated) {
        existingMetadata[table.name] = {
          indexes: await db.dialect.schemaInspector.getIndexes(table.name),
          foreignKeys: await db.dialect.schemaInspector.getForeignKeys(table.name),
        };
      }

      await db.connection.transaction(async (trx) => {
        await this.createTables(schemaDiff.tables.added, trx);

        if (forceMigration) {
          // drop all delete table foreign keys then delete the tables
          for (const table of schemaDiff.tables.removed) {
            debug(`Removing table foreign keys: ${table.name}`);

            const schemaBuilder = this.getSchemaBuilder(trx);
            await helpers.dropTableForeignKeys(schemaBuilder, table);
          }

          for (const table of schemaDiff.tables.removed) {
            debug(`Removing table: ${table.name}`);

            const schemaBuilder = this.getSchemaBuilder(trx);
            await helpers.dropTable(schemaBuilder, table);
          }
        }

        for (const table of schemaDiff.tables.updated) {
          debug(`Updating table: ${table.name}`);
          // alter table
          const schemaBuilder = this.getSchemaBuilder(trx);

          const { indexes, foreignKeys } = existingMetadata[table.name];
          await helpers.alterTable(schemaBuilder, table, { indexes, foreignKeys });
        }
      });

      await db.dialect.endSchemaUpdate();
    },
  };
};

const createHelpers = (db: Database) => {
  /**
   *  Creates a foreign key on a table
   */
  const createForeignKey = (
    tableBuilder: Knex.TableBuilder,
    foreignKey: ForeignKey,
    existingForeignKeys?: ForeignKey[]
  ) => {
    const { name, columns, referencedColumns, referencedTable, onDelete, onUpdate } = foreignKey;

    // Check if it already exists, and if so drop it before creating
    // Note that it is safe to drop multiple times with TableBuilder because it only uses it to define the schema
    const existingForeignKey = existingForeignKeys?.find((fk) => fk.name === name);
    const forceMigration = db.config.settings?.forceMigration;
    if (existingForeignKey && forceMigration) {
      debug(`Dropping existing foreign key ${name}`);
      tableBuilder.dropForeign(existingForeignKey.columns, name);
    }

    const constraint = tableBuilder
      .foreign(columns, name)
      .references(referencedColumns)
      .inTable(db.getSchemaName() ? `${db.getSchemaName()}.${referencedTable}` : referencedTable);

    if (onDelete) {
      constraint.onDelete(onDelete);
    }

    if (onUpdate) {
      constraint.onUpdate(onUpdate);
    }
  };

  /**
   * Drops a foreign key from a table
   */
  const dropForeignKey = (tableBuilder: Knex.TableBuilder, foreignKey: ForeignKey) => {
    const { name, columns } = foreignKey;

    tableBuilder.dropForeign(columns, name);
  };

  /**
   * Creates an index on a table
   */
  const createIndex = (
    tableBuilder: Knex.TableBuilder,
    index: Index,
    existingIndexes?: Index[]
  ) => {
    const { type, columns, name } = index;

    // Check if it already exists, and if so drop it before creating
    // Note that it is safe to drop multiple times with TableBuilder because it only uses it to define the schema
    const existingIndex = existingIndexes?.find((existing) => existing.name === name);
    const forceMigration = db.config.settings?.forceMigration;
    if (forceMigration && existingIndex) {
      dropIndex(tableBuilder, index);
    }

    switch (type) {
      case 'primary': {
        return tableBuilder.primary(columns, { constraintName: name });
      }
      case 'unique': {
        return tableBuilder.unique(columns, { indexName: name });
      }
      default: {
        return tableBuilder.index(columns, name, type);
      }
    }
  };

  /**
   * Drops an index from table
   * @param {Knex.TableBuilder} tableBuilder
   * @param {Index} index
   */
  const dropIndex = (tableBuilder: Knex.TableBuilder, index: Index, existingIndexes?: Index[]) => {
    if (!db.config.settings?.forceMigration) {
      return;
    }

    const { type, columns, name } = index;

    // Check if the index exists in existingIndexes, and return early if it doesn't
    if (existingIndexes && !existingIndexes.some((existingIndex) => existingIndex?.name === name)) {
      debug(`Index ${index.name} not found in existingIndexes. Skipping drop.`);
      return;
    }

    switch (type) {
      case 'primary': {
        return tableBuilder.dropPrimary(name);
      }
      case 'unique': {
        return tableBuilder.dropUnique(columns, name);
      }
      default: {
        return tableBuilder.dropIndex(columns, name);
      }
    }
  };

  /**
   * Creates a column in a table
   */
  const createColumn = (tableBuilder: Knex.TableBuilder, column: Column) => {
    const { type, name, args = [], defaultTo, unsigned, notNullable } = column;

    const col = (tableBuilder[type as keyof Knex.TableBuilder] as any)(name, ...args);

    if (unsigned === true) {
      col.unsigned();
    }

    if (!isNil(defaultTo)) {
      const [value, opts] = castArray(defaultTo);

      if (prop('isRaw', opts)) {
        col.defaultTo(db.connection.raw(value), omit('isRaw', opts));
      } else {
        col.defaultTo(value, opts);
      }
    }

    if (notNullable === true) {
      col.notNullable();
    } else {
      col.nullable();
    }

    return col;
  };

  /**
   * Drops a column from a table
   */
  const dropColumn = (tableBuilder: Knex.TableBuilder, column: Column) => {
    if (!db.config.settings?.forceMigration) {
      return;
    }

    return tableBuilder.dropColumn(column.name);
  };

  /**
   * Creates a table in a database
   */
  const createTable = async (schemaBuilder: Knex.SchemaBuilder, table: Table) => {
    await schemaBuilder.createTable(table.name, (tableBuilder) => {
      // columns
      (table.columns || []).forEach((column) => createColumn(tableBuilder, column));

      // indexes
      (table.indexes || []).forEach((index) => createIndex(tableBuilder, index));

      // foreign keys

      if (!db.dialect.canAlterConstraints()) {
        (table.foreignKeys || []).forEach((foreignKey) =>
          createForeignKey(tableBuilder, foreignKey)
        );
      }
    });
  };

  /**
   * Alters a database table by applying a set of schema changes including updates to columns, indexes, and foreign keys.
   * This function ensures proper ordering of operations to avoid conflicts (e.g., foreign key errors) and handles
   * MySQL-specific quirks where dropping a foreign key can implicitly drop an associated index.
   *
   * @param {Knex.SchemaBuilder} schemaBuilder - Knex SchemaBuilder instance to perform schema operations.
   * @param {TableDiff['diff']} table - A diff object representing the schema changes to be applied to the table.
   * @param {{ indexes: Index[]; foreignKeys: ForeignKey[] }} existingMetadata - Metadata about existing indexes and
   *   foreign keys in the table. Used to ensure safe operations and avoid unnecessary modifications.
   *   - indexes: Array of existing index definitions.
   *   - foreignKeys: Array of existing foreign key definitions.
   */
  const alterTable = async (
    schemaBuilder: Knex.SchemaBuilder,
    table: TableDiff['diff'],
    existingMetadata: { indexes: Index[]; foreignKeys: ForeignKey[] } = {
      indexes: [],
      foreignKeys: [],
    }
  ) => {
    let existingIndexes = [...existingMetadata.indexes];
    const existingForeignKeys = [...existingMetadata.foreignKeys];

    // Track dropped foreign keys
    const droppedForeignKeyNames: string[] = [];

    await schemaBuilder.alterTable(table.name, async (tableBuilder) => {
      // Drop foreign keys first to avoid foreign key errors in the following steps
      for (const removedForeignKey of table.foreignKeys.removed) {
        debug(`Dropping foreign key ${removedForeignKey.name} on ${table.name}`);
        dropForeignKey(tableBuilder, removedForeignKey);

        droppedForeignKeyNames.push(removedForeignKey.name);
      }

      for (const updatedForeignKey of table.foreignKeys.updated) {
        debug(`Dropping updated foreign key ${updatedForeignKey.name} on ${table.name}`);
        dropForeignKey(tableBuilder, updatedForeignKey.object);

        droppedForeignKeyNames.push(updatedForeignKey.object.name);
      }

      // In MySQL, dropping a foreign key can also implicitly drop an index with the same name
      // Remove dropped foreign keys from existingIndexes for MySQL
      if (db.config.connection.client === 'mysql') {
        existingIndexes = existingIndexes.filter(
          (index) => !droppedForeignKeyNames.includes(index.name)
        );
      }

      for (const removedIndex of table.indexes.removed) {
        debug(`Dropping index ${removedIndex.name} on ${table.name}`);
        dropIndex(tableBuilder, removedIndex, existingIndexes);
      }

      for (const updatedIndex of table.indexes.updated) {
        debug(`Dropping updated index ${updatedIndex.name} on ${table.name}`);
        dropIndex(tableBuilder, updatedIndex.object, existingIndexes);
      }

      // Drop columns after FKs have been removed to avoid FK errors
      for (const removedColumn of table.columns.removed) {
        debug(`Dropping column ${removedColumn.name} on ${table.name}`);
        dropColumn(tableBuilder, removedColumn);
      }

      // Update existing columns
      for (const updatedColumn of table.columns.updated) {
        debug(`Updating column ${updatedColumn.name} on ${table.name}`);

        const { object } = updatedColumn;

        if (object.type === 'increments') {
          createColumn(tableBuilder, { ...object, type: 'integer' }).alter();
        } else {
          createColumn(tableBuilder, object).alter();
        }
      }

      // Add any new columns
      for (const addedColumn of table.columns.added) {
        debug(`Creating column ${addedColumn.name} on ${table.name}`);

        if (addedColumn.type === 'increments' && !db.dialect.canAddIncrements()) {
          tableBuilder.integer(addedColumn.name).unsigned();
          tableBuilder.primary([addedColumn.name]);
        } else {
          createColumn(tableBuilder, addedColumn);
        }
      }

      // once the columns have all been updated, we can create indexes again
      for (const updatedForeignKey of table.foreignKeys.updated) {
        debug(`Recreating updated foreign key ${updatedForeignKey.name} on ${table.name}`);
        createForeignKey(tableBuilder, updatedForeignKey.object, existingForeignKeys);
      }

      for (const updatedIndex of table.indexes.updated) {
        debug(`Recreating updated index ${updatedIndex.name} on ${table.name}`);
        createIndex(tableBuilder, updatedIndex.object, existingIndexes);
      }

      for (const addedForeignKey of table.foreignKeys.added) {
        debug(`Creating foreign key ${addedForeignKey.name} on ${table.name}`);
        createForeignKey(tableBuilder, addedForeignKey, existingForeignKeys);
      }

      for (const addedIndex of table.indexes.added) {
        debug(`Creating index ${addedIndex.name} on ${table.name}`);
        createIndex(tableBuilder, addedIndex, existingIndexes);
      }
    });
  };

  /**
   * Drops a table from a database
   */
  const dropTable = (schemaBuilder: Knex.SchemaBuilder, table: Table) => {
    if (!db.config.settings.forceMigration) {
      return;
    }

    return schemaBuilder.dropTableIfExists(table.name);
  };

  /**
   * Creates a table foreign keys constraints
   */
  const createTableForeignKeys = async (schemaBuilder: Knex.SchemaBuilder, table: Table) => {
    // foreign keys
    await schemaBuilder.table(table.name, (tableBuilder) => {
      (table.foreignKeys || []).forEach((foreignKey) => createForeignKey(tableBuilder, foreignKey));
    });
  };

  /**
   * Drops a table foreign keys constraints
   */
  const dropTableForeignKeys = async (schemaBuilder: Knex.SchemaBuilder, table: Table) => {
    if (!db.config.settings.forceMigration) {
      return;
    }

    // foreign keys
    await schemaBuilder.table(table.name, (tableBuilder) => {
      (table.foreignKeys || []).forEach((foreignKey) => dropForeignKey(tableBuilder, foreignKey));
    });
  };

  return {
    createTable,
    alterTable,
    dropTable,
    createTableForeignKeys,
    dropTableForeignKeys,
  };
};
