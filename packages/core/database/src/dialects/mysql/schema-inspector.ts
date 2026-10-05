import type { Column, ForeignKey, Index, Schema } from '../../schema/types';
import type { SchemaInspector } from '../dialect';
import type { Database } from '../..';

interface RawTable {
  table_name: string;
}

interface RawColumn {
  table_name: string;
  data_type: string;
  column_name: string;
  character_maximum_length: number;
  column_default: string;
  is_nullable: string;
  column_type: string;
  column_key: string;
}

interface RawIndex {
  table_name: string;
  key_name: string;
  column_name: string;
  non_unique: number | string;
}

interface RawForeignKey {
  table_name: string;
  constraint_name: string;
  column_name: string;
  referenced_table_name: string | null;
  referenced_column_name: string | null;
  on_update: string;
  on_delete: string;
}

const SQL_QUERIES = {
  TABLE_LIST: /* sql */ `
    SELECT
      t.table_name as table_name
    FROM information_schema.tables t
    WHERE table_type = 'BASE TABLE'
    AND table_schema = schema();
  `,
  BULK_COLUMNS: /* sql */ `
    SELECT
      c.table_name as table_name,
      c.data_type as data_type,
      c.column_name as column_name,
      c.character_maximum_length as character_maximum_length,
      c.column_default as column_default,
      c.is_nullable as is_nullable,
      c.column_type as column_type,
      c.column_key as column_key
    FROM information_schema.columns c
    WHERE table_schema = database()
    AND table_name in (:tables);
  `,
  BULK_INDEXES: /* sql */ `
    SELECT
      s.table_name as table_name,
      s.index_name as key_name,
      s.column_name as column_name,
      s.non_unique as non_unique
    FROM information_schema.statistics s
    WHERE s.table_schema = database()
    AND s.table_name in (:tables)
    ORDER BY s.table_name, s.index_name, s.seq_in_index;
  `,
  BULK_FOREIGN_KEYS: /* sql */ `
    SELECT
      tc.table_name as table_name,
      tc.constraint_name as constraint_name,
      kcu.column_name as column_name,
      kcu.referenced_table_name as referenced_table_name,
      kcu.referenced_column_name as referenced_column_name,
      rc.update_rule as on_update,
      rc.delete_rule as on_delete
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
      AND tc.table_schema = rc.constraint_schema
      AND tc.table_name = rc.table_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = database()
    AND tc.table_name in (:tables)
    ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;
  `,
};

const toStrapiType = (column: RawColumn) => {
  const rootType = column.data_type.toLowerCase().match(/[^(), ]+/)?.[0];

  switch (rootType) {
    case 'int': {
      if (column.column_key === 'PRI') {
        return { type: 'increments', args: [{ primary: true, primaryKey: true }], unsigned: false };
      }

      return { type: 'integer' };
    }
    case 'decimal': {
      return { type: 'decimal', args: [10, 2] };
    }
    case 'double': {
      return { type: 'double' };
    }
    case 'bigint': {
      return { type: 'bigInteger' };
    }
    case 'enum': {
      return { type: 'string' };
    }
    case 'tinyint': {
      return { type: 'boolean' };
    }
    case 'longtext': {
      return { type: 'text', args: ['longtext'] };
    }
    case 'varchar': {
      return { type: 'string', args: [column.character_maximum_length] };
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
    case 'timestamp': {
      return { type: 'timestamp', args: [{ useTz: false, precision: 6 }] };
    }
    case 'json': {
      return { type: 'jsonb' };
    }
    default: {
      return { type: 'specificType', args: [column.data_type] };
    }
  }
};

export default class MysqlSchemaInspector implements SchemaInspector {
  db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async getSchema() {
    const schema: Schema = { tables: [] };

    const tables = await this.getTables();

    if (tables.length === 0) {
      return schema;
    }

    // Run 3 bulk queries in parallel instead of N+1 per-table queries
    const [allColumns, allIndexes, allForeignKeys] = await Promise.all([
      this.getBulkColumns(tables),
      this.getBulkIndexes(tables),
      this.getBulkForeignKeys(tables),
    ]);

    schema.tables = tables.map((tableName) => ({
      name: tableName,
      columns: allColumns.get(tableName) ?? [],
      indexes: allIndexes.get(tableName) ?? [],
      foreignKeys: allForeignKeys.get(tableName) ?? [],
    }));

    return schema;
  }

  async getTables(): Promise<string[]> {
    const [rows] = await this.db.connection.raw<[RawTable[]]>(SQL_QUERIES.TABLE_LIST);

    return rows.map((row) => row.table_name);
  }

  async getBulkColumns(tableNames: string[]): Promise<Map<string, Column[]>> {
    if (tableNames.length === 0) {
      return new Map();
    }

    const [rows] = await this.db.connection.raw<[RawColumn[]]>(SQL_QUERIES.BULK_COLUMNS, {
      tables: this.db.connection.raw(tableNames.map(() => '?').join(', '), tableNames),
    });

    const result = new Map<string, Column[]>();

    for (const row of rows) {
      const { type, args = [], ...rest } = toStrapiType(row);

      const column: Column = {
        type,
        args,
        defaultTo: row.column_default,
        name: row.column_name,
        notNullable: row.is_nullable === 'NO',
        unsigned: row.column_type.endsWith(' unsigned'),
        ...rest,
      };

      const existing = result.get(row.table_name);
      if (existing) {
        existing.push(column);
      } else {
        result.set(row.table_name, [column]);
      }
    }

    return result;
  }

  async getColumns(tableName: string): Promise<Column[]> {
    const result = await this.getBulkColumns([tableName]);
    return result.get(tableName) ?? [];
  }

  async getBulkIndexes(tableNames: string[]): Promise<Map<string, Index[]>> {
    if (tableNames.length === 0) {
      return new Map();
    }

    const [rows] = await this.db.connection.raw<[RawIndex[]]>(SQL_QUERIES.BULK_INDEXES, {
      tables: this.db.connection.raw(tableNames.map(() => '?').join(', '), tableNames),
    });

    // Group by table, then by key_name
    const byTable = new Map<string, Map<string, Index>>();

    for (const index of rows) {
      if (index.column_name === 'id') {
        continue;
      }

      let tableIndexes = byTable.get(index.table_name);
      if (!tableIndexes) {
        tableIndexes = new Map();
        byTable.set(index.table_name, tableIndexes);
      }

      const existing = tableIndexes.get(index.key_name);
      if (existing) {
        existing.columns.push(index.column_name);
      } else {
        const indexInfo: Index = {
          columns: [index.column_name],
          name: index.key_name,
        };
        if (!index.non_unique || index.non_unique === '0') {
          indexInfo.type = 'unique';
        }
        tableIndexes.set(index.key_name, indexInfo);
      }
    }

    const result = new Map<string, Index[]>();
    for (const [tableName, tableIndexes] of byTable) {
      result.set(tableName, Array.from(tableIndexes.values()));
    }

    return result;
  }

  async getIndexes(tableName: string): Promise<Index[]> {
    const result = await this.getBulkIndexes([tableName]);
    return result.get(tableName) ?? [];
  }

  async getBulkForeignKeys(tableNames: string[]): Promise<Map<string, ForeignKey[]>> {
    if (tableNames.length === 0) {
      return new Map();
    }

    const [rows] = await this.db.connection.raw<[RawForeignKey[]]>(SQL_QUERIES.BULK_FOREIGN_KEYS, {
      tables: this.db.connection.raw(tableNames.map(() => '?').join(', '), tableNames),
    });

    // Group by table_name, then by constraint_name
    const byTable = new Map<string, Map<string, ForeignKey>>();

    for (const row of rows) {
      let tableFKs = byTable.get(row.table_name);
      if (!tableFKs) {
        tableFKs = new Map();
        byTable.set(row.table_name, tableFKs);
      }

      let fk = tableFKs.get(row.constraint_name);
      if (!fk) {
        fk = {
          name: row.constraint_name,
          columns: [row.column_name],
          referencedColumns: row.referenced_column_name ? [row.referenced_column_name] : [],
          referencedTable: row.referenced_table_name,
          onUpdate: row.on_update?.toUpperCase() ?? null,
          onDelete: row.on_delete?.toUpperCase() ?? null,
        } as unknown as ForeignKey;
        tableFKs.set(row.constraint_name, fk);
      } else {
        if (!fk.columns.includes(row.column_name)) {
          fk.columns.push(row.column_name);
        }
        if (
          row.referenced_column_name &&
          !fk.referencedColumns.includes(row.referenced_column_name)
        ) {
          fk.referencedColumns.push(row.referenced_column_name);
        }
      }
    }

    const result = new Map<string, ForeignKey[]>();
    for (const [tableName, tableFKs] of byTable) {
      result.set(tableName, Array.from(tableFKs.values()));
    }

    return result;
  }

  async getForeignKeys(tableName: string): Promise<ForeignKey[]> {
    const result = await this.getBulkForeignKeys([tableName]);
    return result.get(tableName) ?? [];
  }
}
