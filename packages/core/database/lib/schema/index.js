'use strict';

const { castArray } = require('lodash/fp');

const database = {
  tables: [
    {
      name: 'articles',
      schema: 'public',
      indexes: [
        {
          name: '',
          columns: [''],
          type: 'category_id',
          refColumn: 'id',
          refTable: 'categories',
          onDelete: 'CASCADE',
          onUpdate: 'NO ACTION',
        },
      ],
      foreignKeys: [
        {
          name: 'fk_name',
          column: '',
        },
      ],
      columns: [
        {
          name: 'id',
          type: 'increments',
          args: [],
        },
        {
          name: 'test',
          type: 'specificType',
          args: ['blob'],
        },
        {
          name: 'test',
          type: 'biginteger',
          args: [],
        },
        {
          name: 'colu',
          type: 'integer',
          unsigned: true,
          defaultTo: 'new',
        },
        {
          name: 'colum',
          type: 'integer',
          unsigned: true,
          defaultTo: ['something', { constraintName: 'some constraint' }],
        },
      ],
    },
  ],
};

const createTable = async table => {
  const schema = table.schema ? knex.schema.withSchem(table.schema) : knex.schema;

  await schema.createTable(table.name, t => {
    // columns
    table.columns.forEach(column => {
      const col = t[column.type](column.name, ...column.args);

      // primary key auto increment
      // TODO:: set index name
      if (column.primary) {
        col.primary();
      }

      if (column.unsigned) {
        col.unsigned();
      }

      if (column.defaultTo) {
        col.defaultTo(...castArray(column.defaultTo));
      }

      if (column.unique) {
        // TODO:: set index name
        col.unique();
      }

      if (column.notNullable) {
        col.notNullable();
      } else {
        col.nullable();
      }

      return col;
    });

    //indexes
    table.indexes.forEach(index => {
      if (index.type === 'primary') {
        t.primary(index.columns, index.name);
      }

      if (index.type === 'unique') {
        t.unique(index.columns, index.name);
      }

      t.index(index.columns, index.name, index.type);
    });

    // foreign keys
    table.foreignKeys.forEach(fk => {
      const constraint = table
        .foreign(fk.column, fk.name)
        .references(fk.refColumn)
        .inTable(fk.refTable);

      if (fk.onDelete) {
        constraint.onDelete(fk.onDelete);
      }

      if (fk.onUpdate) {
        constraint.onUpdate(fk.onUpdate);
      }
    });
  });
};

const getColumnType = attribute => {
  if (attribute.columnType) {
    return attribute.columnType;
  }

  switch (attribute.type) {
    case 'uuid':
      return '';
    case 'uid':
      return '';
    case 'richtext':
      return '';
    case 'text':
      return '';
    case 'json':
      return '';
    case 'enumeration':
      return '';
    case 'string':
      return '';
    case 'password':
      return '';
    case 'email':
      return '';
    case 'integer':
      return '';
    case 'biginteger':
      return '';
    case 'float':
      return '';
    case 'decimal':
      return '';
    case 'date':
      return '';
    case 'time':
      return '';
    case 'datetime':
      return '';
    case 'timestamp':
      return '';
    case 'currentTimestamp':
      return '';
    case 'boolean':
      return '';
  }
};

const createSchemaProvider = db => {
  /*
    1. Load schema from DB
    3. Run migrations on old schema
    2. Build new schema
    4. Diff the two
    5. Apply diff
  */

  const tables = [];

  for (const model of db.metadata) {
    const table = {
      name: model.tableName,
      schema: model.schema, // TODO: specify at the connection level ?
      columns: [],
      indexes: [],
    };

    for (const [attributeName, attribute] of model.attributes) {
      // if scalar

      table.columns.push({
        name: attribute.columnName,
        // TODO: find type for specific dialect
        type: getColumnType(attribute),
      });
    }

    tables.push(table);
  }

  return {};
};

module.exports = createSchemaProvider;
