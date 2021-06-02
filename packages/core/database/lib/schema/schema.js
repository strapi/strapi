'use strict';

const fake = {
  tables: [
    {
      name: 'categories',
      columns: [
        {
          name: 'id',
          type: 'increments',
          args: [],
        },
      ],
    },
    {
      name: 'articles',
      indexes: [
        {
          name: 'unique_test',
          columns: ['test_big'],
          type: 'unique',
        },
      ],
      foreignKeys: [],
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
          name: 'test_big',
          type: 'biginteger',
          args: [],
        },
        {
          name: 'colu',
          type: 'integer',
          unsigned: true,
          defaultTo: 'new',
          args: [],
        },
      ],
    },
    {
      name: 'articles_categories_categories',
      indexes: [
        {
          columns: ['article_id', 'category_id'],
          type: 'primary',
        },
      ],
      foreignKeys: [
        {
          // name: 'fk_name',
          column: 'category_id',
          referencedColumn: 'id',
          referencedTable: 'categories',
          onDelete: 'CASCADE',
        },
        {
          // name: '',
          column: 'article_id',
          referencedColumn: 'id',
          referencedTable: 'articles',
          onDelete: 'CASCADE',
          onUpdate: 'NO ACTION',
        },
      ],
      columns: [
        {
          name: 'article_id',
          type: 'integer',
          unsigned: true,
        },
        {
          name: 'category_id',
          type: 'integer',
          unsigned: true,
        },
      ],
    },
  ],
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

const metadataToSchema = metadata => {
  return fake;

  /*
    const tables = [];

    for (const model of metadata) {
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

    return {
      tables,
    };

    */
};

module.exports = { metadataToSchema };
