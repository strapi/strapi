import * as types from '../utils/types';

import type { Metadata, Meta } from '../metadata';
import type { Column, Schema, Table } from './types';
import type { Attribute } from '../types';

const createColumn = (name: string, attribute: Attribute): Column => {
  const { type, args = [], ...opts } = getColumnType(attribute);

  return {
    name,
    type,
    args,
    defaultTo: null,
    notNullable: false,
    unsigned: false,
    ...opts,
    ...('column' in attribute ? attribute.column ?? {} : {}),
  };
};

const createTable = (meta: Meta): Table => {
  const table: Table = {
    name: meta.tableName,
    indexes: meta.indexes || [],
    foreignKeys: meta.foreignKeys || [],
    columns: [],
  };

  for (const key of Object.keys(meta.attributes)) {
    const attribute = meta.attributes[key];

    // if (types.isRelation(attribute.type)) {
    if (attribute.type === 'relation') {
      if ('morphColumn' in attribute && attribute.morphColumn && attribute.owner) {
        const { idColumn, typeColumn } = attribute.morphColumn;

        table.columns.push(
          createColumn(idColumn.name, {
            type: 'integer',
            column: {
              unsigned: true,
            },
          })
        );

        table.columns.push(createColumn(typeColumn.name, { type: 'string' }));
      } else if (
        'joinColumn' in attribute &&
        attribute.joinColumn &&
        attribute.owner &&
        attribute.joinColumn.referencedTable
      ) {
        // NOTE: we could pass uniquness for oneToOne to avoid creating more than one to one

        const { name: columnName, referencedColumn, referencedTable } = attribute.joinColumn;

        const column = createColumn(columnName, {
          type: 'integer',
          column: {
            unsigned: true,
          },
        });

        table.columns.push(column);

        table.foreignKeys.push({
          name: `${table.name}_${columnName}_fk`,
          columns: [columnName],
          referencedTable,
          referencedColumns: [referencedColumn],
          // NOTE: could allow configuration
          onDelete: 'SET NULL',
        });

        table.indexes.push({
          name: `${table.name}_${columnName}_fk`,
          columns: [columnName],
        });
      }
    } else if (types.isScalarAttribute(attribute)) {
      const column = createColumn(attribute.columnName || key, attribute);

      if (column.unique) {
        table.indexes.push({
          type: 'unique',
          name: `${table.name}_${column.name}_unique`,
          columns: [column.name],
        });
      }

      if (column.primary) {
        table.indexes.push({
          type: 'primary',
          name: `${table.name}_${column.name}_primary`,
          columns: [column.name],
        });
      }

      table.columns.push(column);
    }
  }

  return table;
};

const getColumnType = (attribute: Attribute) => {
  if ('columnType' in attribute && attribute.columnType) {
    return attribute.columnType;
  }

  switch (attribute.type) {
    case 'increments': {
      return {
        type: 'increments',
        args: [{ primary: true, primaryKey: true }],
        notNullable: true,
      };
    }

    // We might want to convert email/password to string types before going into the orm with specific validators & transformers
    case 'password':
    case 'email':
    case 'string':
    case 'enumeration': {
      return { type: 'string' };
    }
    case 'uid': {
      return {
        type: 'string',
        unique: true,
      };
    }
    case 'richtext':
    case 'text': {
      return {
        type: 'text',
        args: ['longtext'],
      };
    }
    case 'blocks':
    case 'json': {
      return { type: 'jsonb' };
    }
    case 'integer': {
      return { type: 'integer' };
    }
    case 'biginteger': {
      return { type: 'bigInteger' };
    }
    case 'float': {
      return { type: 'double' };
    }
    case 'decimal': {
      return { type: 'decimal', args: [10, 2] };
    }
    case 'date': {
      return { type: 'date' };
    }
    case 'time': {
      return { type: 'time', args: [{ precision: 3 }] };
    }
    case 'datetime': {
      return {
        type: 'datetime',
        args: [
          {
            useTz: false,
            precision: 6,
          },
        ],
      };
    }
    case 'timestamp': {
      return {
        type: 'timestamp',
        args: [
          {
            useTz: false,
            precision: 6,
          },
        ],
      };
    }
    case 'boolean': {
      return { type: 'boolean' };
    }
    default: {
      throw new Error(`Unknown type ${attribute.type}`);
    }
  }
};

export const metadataToSchema = (metadata: Metadata): Schema => {
  const schema: Schema = {
    tables: [],
  };

  metadata.forEach((metadata) => {
    schema.tables.push(createTable(metadata));
  });

  return schema;
};
