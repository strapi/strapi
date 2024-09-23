import * as types from '../utils/types';
import { identifiers } from '../utils/identifiers';
import type { Metadata, Meta } from '../metadata';
import type { Column, Schema, Table } from './types';
import type { Attribute } from '../types';

/**
 * TODO: This needs to be refactored to support incoming names such as
 * (column, table, index) that are of the form string | NameToken[] so
 * that pieces can be passed through and shortened here.
 *
 * Currently, we are potentially shortening twice, although in reality
 * that won't happen since the shortened attribute column names will
 * fit here because they are already shortened to the max identifier
 * length
 *
 * That is the reason we use getName() here and not getColumnName();
 * we just want the exact shortened name for the value without doing
 * any other potential manipulation to it
 * */

const createColumn = (name: string, attribute: Attribute): Column => {
  const { type, args = [], ...opts } = getColumnType(attribute);

  return {
    name: identifiers.getName(name),
    type,
    args,
    defaultTo: null,
    notNullable: false,
    unsigned: false,
    ...opts,
    ...('column' in attribute ? (attribute.column ?? {}) : {}),
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

        const idColumnName = identifiers.getName(idColumn.name);
        const typeColumnName = identifiers.getName(typeColumn.name);

        table.columns.push(
          createColumn(idColumnName, {
            type: 'integer',
            column: {
              unsigned: true,
            },
          })
        );

        table.columns.push(createColumn(typeColumnName, { type: 'string' }));
      } else if (
        'joinColumn' in attribute &&
        attribute.joinColumn &&
        attribute.owner &&
        attribute.joinColumn.referencedTable
      ) {
        // NOTE: we could pass uniquness for oneToOne to avoid creating more than one to one

        const {
          name: columnNameFull,
          referencedColumn,
          referencedTable,
          columnType = 'integer',
        } = attribute.joinColumn;

        const columnName = identifiers.getName(columnNameFull);

        const column = createColumn(columnName, {
          // TODO: find the column type automatically, or allow passing all the column params
          type: columnType,
          column: {
            unsigned: true,
          },
        });

        table.columns.push(column);

        const fkName = identifiers.getFkIndexName([table.name, columnName]);
        table.foreignKeys.push({
          name: fkName,
          columns: [column.name],
          referencedTable,
          referencedColumns: [referencedColumn],
          // NOTE: could allow configuration
          onDelete: 'SET NULL',
        });

        table.indexes.push({
          name: fkName,
          columns: [column.name],
        });
      }
    } else if (types.isScalarAttribute(attribute)) {
      const columnName = identifiers.getName(attribute.columnName || key);

      const column = createColumn(columnName, attribute);

      if (column.unique) {
        table.indexes.push({
          type: 'unique',
          name: identifiers.getUniqueIndexName([table.name, column.name]),
          columns: [columnName],
        });
      }

      if (column.primary) {
        table.indexes.push({
          type: 'primary',
          name: identifiers.getPrimaryIndexName([table.name, column.name]),
          columns: [columnName],
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
