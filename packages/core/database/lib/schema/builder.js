'use strict';

const { isNil, prop, omit, castArray } = require('lodash/fp');
const debug = require('debug')('strapi::database');

module.exports = db => {
  const helpers = createHelpers(db);

  return {
    /**
     * Returns a knex schema builder instance
     * @param {string} table - table name
     */
    getSchemaBuilder(trx) {
      return db.getSchemaConnection(trx);
    },

    /**
     * Creates schema in DB
     * @param {Schema} schema - database schema
     */
    async createSchema(schema) {
      await db.connection.transaction(async trx => {
        await this.createTables(schema.tables, trx);
      });
    },

    /**
     * Creates a list of tables in a schema
     * @param {KnexInstance} trx
     * @param {Table[]} tables
     */
    async createTables(tables, trx) {
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
     * @param {Schema} schema - database schema
     * @param {object} opts
     * @param {boolean} opts.dropDatabase - weather to drop the entire database or simply drop the tables
     */
    async dropSchema(schema, { dropDatabase = false } = {}) {
      if (dropDatabase) {
        // TODO: drop database & return as it will drop everything
        return;
      }

      await db.connection.transaction(async trx => {
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
    async updateSchema(schemaDiff) {
      const { forceMigration } = db.config.settings;

      await db.dialect.startSchemaUpdate();
      await db.connection.transaction(async trx => {
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

          await helpers.alterTable(schemaBuilder, table);
        }
      });

      await db.dialect.endSchemaUpdate();
    },
  };
};

const createHelpers = db => {
  /**
   *  Creates a foreign key on a table
   * @param {Knex.TableBuilder} tableBuilder
   * @param {ForeignKey} foreignKey
   */
  const createForeignKey = (tableBuilder, foreignKey) => {
    const { name, columns, referencedColumns, referencedTable, onDelete, onUpdate } = foreignKey;

    const constraint = tableBuilder
      .foreign(columns, name)
      .references(referencedColumns)
      .inTable(
        db.connection.getSchemaName()
          ? `${db.connection.getSchemaName()}.${referencedTable}`
          : referencedTable
      );

    if (onDelete) {
      constraint.onDelete(onDelete);
    }

    if (onUpdate) {
      constraint.onUpdate(onUpdate);
    }
  };

  /**
   * Drops a foreign key from a table
   * @param {Knex.TableBuilder} tableBuilder
   * @param {ForeignKey} foreignKey
   */
  const dropForeignKey = (tableBuilder, foreignKey) => {
    const { name, columns } = foreignKey;

    tableBuilder.dropForeign(columns, name);
  };

  /**
   * Creates an index on a table
   * @param {Knex.TableBuilder} tableBuilder
   * @param {Index} index
   */
  const createIndex = (tableBuilder, index) => {
    const { type, columns, name } = index;

    switch (type) {
      case 'primary': {
        return tableBuilder.primary(columns, name);
      }
      case 'unique': {
        return tableBuilder.unique(columns, name);
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
  const dropIndex = (tableBuilder, index) => {
    if (!db.config.settings.forceMigration) {
      return;
    }

    const { type, columns, name } = index;

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
   * @param {Knex.TableBuilder} tableBuilder
   * @param {Column} column
   */
  const createColumn = (tableBuilder, column) => {
    const { type, name, args = [], defaultTo, unsigned, notNullable } = column;

    const col = tableBuilder[type](name, ...args);

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
   * @param {Knex.TableBuilder} tableBuilder
   * @param {Column} column
   */
  const dropColumn = (tableBuilder, column) => {
    if (!db.config.settings.forceMigration) {
      return;
    }

    return tableBuilder.dropColumn(column.name);
  };

  /**
   * Creates a table in a database
   * @param {SchemaBuilder} schemaBuilder
   * @param {Table} table
   */
  const createTable = async (schemaBuilder, table) => {
    await schemaBuilder.createTable(table.name, tableBuilder => {
      // columns
      (table.columns || []).forEach(column => createColumn(tableBuilder, column));

      // indexes
      (table.indexes || []).forEach(index => createIndex(tableBuilder, index));

      // foreign keys

      if (!db.dialect.canAlterConstraints()) {
        (table.foreignKeys || []).forEach(foreignKey => createForeignKey(tableBuilder, foreignKey));
      }
    });
  };

  const alterTable = async (schemaBuilder, table) => {
    await schemaBuilder.alterTable(table.name, tableBuilder => {
      // Delete indexes / fks / columns

      for (const removedIndex of table.indexes.removed) {
        debug(`Dropping index ${removedIndex.name}`);
        dropIndex(tableBuilder, removedIndex);
      }

      for (const updateddIndex of table.indexes.updated) {
        debug(`Dropping updated index ${updateddIndex.name}`);
        dropIndex(tableBuilder, updateddIndex.object);
      }

      for (const removedForeignKey of table.foreignKeys.removed) {
        debug(`Dropping foreign key ${removedForeignKey.name}`);
        dropForeignKey(tableBuilder, removedForeignKey);
      }

      for (const updatedForeignKey of table.foreignKeys.updated) {
        debug(`Dropping updated foreign key ${updatedForeignKey.name}`);
        dropForeignKey(tableBuilder, updatedForeignKey.object);
      }

      for (const removedColumn of table.columns.removed) {
        debug(`Dropping column ${removedColumn.name}`);
        dropColumn(tableBuilder, removedColumn);
      }

      // Update existing columns / foreign keys / indexes

      for (const updatedColumn of table.columns.updated) {
        debug(`Updating column ${updatedColumn.name}`);

        const { object } = updatedColumn;

        createColumn(tableBuilder, object).alter();
      }

      for (const updatedForeignKey of table.foreignKeys.updated) {
        debug(`Recreating updated foreign key ${updatedForeignKey.name}`);
        createForeignKey(tableBuilder, updatedForeignKey.object);
      }

      for (const updatedIndex of table.indexes.updated) {
        debug(`Recreating updated index ${updatedIndex.name}`);
        createIndex(tableBuilder, updatedIndex.object);
      }

      for (const addedColumn of table.columns.added) {
        debug(`Creating column ${addedColumn.name}`);
        createColumn(tableBuilder, addedColumn);
      }

      for (const addedForeignKey of table.foreignKeys.added) {
        debug(`Creating foreign keys ${addedForeignKey.name}`);
        createForeignKey(tableBuilder, addedForeignKey);
      }

      for (const addedIndex of table.indexes.added) {
        debug(`Creating index ${addedIndex.name}`);
        createIndex(tableBuilder, addedIndex);
      }
    });
  };

  /**
   * Drops a table from a database
   * @param {Knex.SchemaBuilder} schemaBuilder
   * @param {Table} table
   */
  const dropTable = (schemaBuilder, table) => {
    if (!db.config.settings.forceMigration) {
      return;
    }

    return schemaBuilder.dropTableIfExists(table.name);
  };

  /**
   * Creates a table foreign keys constraints
   * @param {SchemaBuilder} schemaBuilder
   * @param {Table} table
   */
  const createTableForeignKeys = async (schemaBuilder, table) => {
    // foreign keys
    await schemaBuilder.table(table.name, tableBuilder => {
      (table.foreignKeys || []).forEach(foreignKey => createForeignKey(tableBuilder, foreignKey));
    });
  };

  /**
   * Drops a table foreign keys constraints
   * @param {SchemaBuilder} schemaBuilder
   * @param {Table} table
   */
  const dropTableForeignKeys = async (schemaBuilder, table) => {
    if (!db.config.settings.forceMigration) {
      return;
    }

    // foreign keys
    await schemaBuilder.table(table.name, tableBuilder => {
      (table.foreignKeys || []).forEach(foreignKey => dropForeignKey(tableBuilder, foreignKey));
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
