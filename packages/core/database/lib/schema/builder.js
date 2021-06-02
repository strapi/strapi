'use strict';

const { metadataToSchema } = require('./schema');

module.exports = db => {
  const getSchemaBuilder = table => {
    return table.schema ? db.connection.schema.withSchema(table.schema) : db.connection.schema;
  };

  const createColumn = (tableBuilder, column) => {
    const { type, name, args = [], defaultTo, primary, unsigned, unique, notNullable } = column;

    const col = tableBuilder[type](name, ...args);

    // primary key auto increment
    // TODO:: set index name
    if (primary) {
      col.primary();
    }

    if (unsigned) {
      col.unsigned();
    }

    if (defaultTo) {
      // allow some raw default values
      col.defaultTo(...[].concat(defaultTo));
    }

    if (unique) {
      // TODO:: set index name
      col.unique();
    }

    if (notNullable) {
      col.notNullable();
    } else {
      col.nullable();
    }

    return col;
  };

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

  const createForeignKey = (tableBuilder, foreignKey) => {
    const { name, column, referencedColumn, referencedTable, onDelete, onUpdate } = foreignKey;

    const constraint = tableBuilder
      .foreign(column, name)
      .references(referencedColumn)
      .inTable(referencedTable);

    if (onDelete) {
      constraint.onDelete(onDelete);
    }

    if (onUpdate) {
      constraint.onUpdate(onUpdate);
    }
  };

  const createTable = table => {
    const schemaBuilder = getSchemaBuilder(table);

    return schemaBuilder.createTable(table.name, tableBuilder => {
      // columns
      (table.columns || []).forEach(column => createColumn(tableBuilder, column));

      //indexes
      (table.indexes || []).forEach(index => createIndex(tableBuilder, index));

      // foreign keys
      (table.foreignKeys || []).forEach(foreignKey => createForeignKey(tableBuilder, foreignKey));
    });
  };

  const dropTable = table => {
    return getSchemaBuilder(table).dropTableIfExists(table.name);
  };

  const createSchema = async metadata => {
    // TODO: ensure database exists;

    const schema = metadataToSchema(metadata);

    for (const table of schema.tables) {
      await createTable(table);
    }
  };

  const dropSchema = async (metadata, { dropDatabase = false } = {}) => {
    if (dropDatabase) {
      // TODO: drop database & return as it will drop everything
    }

    const schema = metadataToSchema(metadata);

    for (const table of schema.tables.reverse()) {
      await dropTable(table);
    }
  };

  return {
    createSchema,
    dropSchema,
    updateSchema() {},
    createTable,
    dropTable,
  };
};
