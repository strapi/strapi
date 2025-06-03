import type { Database } from '../..';
import type { Schema, Column, Index, ForeignKey } from '../../schema/types';
import type { SchemaInspector } from '../dialect';

const SQL_QUERIES = {
  TABLE_LIST: `select name from sqlite_master where type = 'table' and name NOT LIKE 'sqlite%'`,
  TABLE_INFO: `pragma table_info(??)`,
  INDEX_LIST: 'pragma index_list(??)',
  INDEX_INFO: 'pragma index_info(??)',
  FOREIGN_KEY_LIST: 'pragma foreign_key_list(??)',
};

interface RawTable {
  name: string;
}
interface RawColumn {
  type: string;
  args?: unknown[];
  name: string;
  defaultTo?: unknown;
  notNullable?: boolean;
  unsigned?: boolean;
  unique?: boolean;
  primary?: boolean;
  pk?: boolean;
  foreign?: {
    table: string;
    column: string;
    onUpdate: string;
    onDelete: string;
  };
  data_type?: string;
  dflt_value?: unknown;
  notnull?: boolean;
}

interface RawIndex {
  name: string;
  unique: boolean;
}

interface RawIndexInfo {
  name: string;
}

interface RawForeignKey {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
  on_update: string;
  on_delete: string;
}

const toStrapiType = (column: RawColumn) => {
  const { type } = column;

  const rootType = type.toLowerCase().match(/[^(), ]+/)?.[0];

  switch (rootType) {
    case 'integer': {
      if (column.pk) {
        return { type: 'increments', args: [{ primary: true, primaryKey: true }] };
      }

      return { type: 'integer' };
    }
    case 'float': {
      return { type: 'float', args: [10, 2] };
    }
    case 'bigint': {
      return { type: 'bigInteger' };
    }
    case 'varchar': {
      const length = type.slice(8, type.length - 1);

      return { type: 'string', args: [Number(length)] };
    }
    case 'text': {
      return { type: 'text', args: ['longtext'] };
    }
    case 'json': {
      return { type: 'jsonb' };
    }
    case 'boolean': {
      return { type: 'boolean' };
    }
    case 'datetime': {
      return { type: 'datetime', args: [{ useTz: false, precision: 6 }] };
    }
    case 'date': {
      return { type: 'date' };
    }
    case 'time': {
      return { type: 'time', args: [{ precision: 3 }] };
    }
    default: {
      return { type: 'specificType', args: [column.data_type] };
    }
  }
};

export default class SqliteSchemaInspector implements SchemaInspector {
  db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async getSchema() {
    const schema: Schema = { tables: [] };
    const tables = await this.getTables();

    for (const tableName of tables) {
      const columns = await this.getColumns(tableName);
      const indexes = await this.getIndexes(tableName);
      const foreignKeys = await this.getForeignKeys(tableName);

      schema.tables.push({
        name: tableName,
        columns,
        indexes,
        foreignKeys,
      });
    }

    return schema;
  }

  async getTables(): Promise<string[]> {
    const rows = await this.db.connection.raw<RawTable[]>(SQL_QUERIES.TABLE_LIST);

    return rows.map((row) => row.name);
  }

  async getColumns(tableName: string): Promise<Column[]> {
    const rows = await this.db.connection.raw<RawColumn[]>(SQL_QUERIES.TABLE_INFO, [tableName]);

    return rows.map((row) => {
      const { type, args = [], ...rest } = toStrapiType(row);

      return {
        type,
        args,
        name: row.name,
        defaultTo: row.dflt_value,
        notNullable: row.notnull !== null ? Boolean(row.notnull) : null,
        unsigned: false,
        ...rest,
      };
    });
  }

  async getIndexes(tableName: string): Promise<Index[]> {
    const indexes = await this.db.connection.raw<RawIndex[]>(SQL_QUERIES.INDEX_LIST, [tableName]);

    const ret: Index[] = [];

    for (const index of indexes.filter((index) => !index.name.startsWith('sqlite_'))) {
      const res = await this.db.connection.raw<RawIndexInfo[]>(SQL_QUERIES.INDEX_INFO, [
        index.name,
      ]);

      const indexInfo: Index = {
        columns: res.map((row) => row.name),
        name: index.name,
      };

      if (index.unique) {
        indexInfo.type = 'unique';
      }

      ret.push(indexInfo);
    }

    return ret;
  }

  async getForeignKeys(tableName: string): Promise<ForeignKey[]> {
    const fks = await this.db.connection.raw<RawForeignKey[]>(SQL_QUERIES.FOREIGN_KEY_LIST, [
      tableName,
    ]);

    const ret: Record<RawForeignKey['id'], ForeignKey> = {};

    for (const fk of fks) {
      if (!ret[fk.id]) {
        ret[fk.id] = {
          // TODO: name, //  find name
          name: '',
          columns: [fk.from],
          referencedColumns: [fk.to],
          referencedTable: fk.table,
          onUpdate: fk.on_update.toUpperCase(),
          onDelete: fk.on_delete.toUpperCase(),
        };
      } else {
        ret[fk.id].columns.push(fk.from);
        ret[fk.id].referencedColumns.push(fk.to);
      }
    }

    return Object.values(ret);
  }
}
