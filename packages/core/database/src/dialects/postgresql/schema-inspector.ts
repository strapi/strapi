import type { Database } from '../..';
import type { Schema, Column, Index, ForeignKey } from '../../schema/types';
import type { SchemaInspector } from '../dialect';

interface RawColumn {
  table_name: string;
  data_type: string;
  column_name: string;
  character_maximum_length: number;
  column_default: string;
  is_nullable: string;
}

interface RawIndex {
  table_name: string;
  indexrelid: string;
  index_name: string;
  column_name: string;
  is_unique: boolean;
  is_primary: boolean;
}

interface RawTable {
  table_name: string;
}

const SQL_QUERIES = {
  TABLE_LIST: /* sql */ `
    SELECT *
    FROM information_schema.tables
    WHERE
      table_schema = ?
      AND table_type = 'BASE TABLE'
      AND table_name != 'geometry_columns'
      AND table_name != 'spatial_ref_sys';
  `,
  BULK_COLUMNS: /* sql */ `
    SELECT table_name, data_type, column_name, character_maximum_length, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_schema = ? AND table_name = ANY(?);
  `,
  BULK_INDEXES: /* sql */ `
    SELECT
      t.relname as table_name,
      ix.indexrelid,
      i.relname as index_name,
      a.attname as column_name,
      ix.indisunique as is_unique,
      ix.indisprimary as is_primary
    FROM
      pg_class t,
      pg_namespace s,
      pg_class i,
      pg_index ix,
      pg_attribute a
    WHERE
      t.oid = ix.indrelid
      AND i.oid = ix.indexrelid
      AND a.attrelid = t.oid
      AND a.attnum = ANY(ix.indkey)
      AND t.relkind = 'r'
      AND t.relnamespace = s.oid
      AND s.nspname = ?
      AND t.relname = ANY(?);
  `,
  BULK_FOREIGN_KEYS: /* sql */ `
    SELECT
      tco.table_name,
      tco.constraint_name,
      kcu.column_name,
      rco.update_rule as on_update,
      rco.delete_rule as on_delete,
      rel_kcu.table_name as foreign_table,
      rel_kcu.column_name as fk_column_name
    FROM information_schema.table_constraints tco
    JOIN information_schema.key_column_usage kcu
      ON tco.constraint_name = kcu.constraint_name
      AND tco.constraint_schema = kcu.constraint_schema
      AND tco.table_name = kcu.table_name
    JOIN information_schema.referential_constraints rco
      ON tco.constraint_name = rco.constraint_name
      AND tco.constraint_schema = rco.constraint_schema
    JOIN information_schema.key_column_usage rel_kcu
      ON rco.unique_constraint_name = rel_kcu.constraint_name
      AND rco.unique_constraint_schema = rel_kcu.constraint_schema
    WHERE tco.constraint_type = 'FOREIGN KEY'
      AND tco.constraint_schema = ?
      AND tco.table_name = ANY(?);
  `,
};

const toStrapiType = (column: RawColumn) => {
  const rootType = column.data_type.toLowerCase().match(/[^(), ]+/)?.[0];

  switch (rootType) {
    case 'integer': {
      // find a way to figure out the increments
      return { type: 'integer' };
    }
    case 'text': {
      return { type: 'text', args: ['longtext'] };
    }
    case 'boolean': {
      return { type: 'boolean' };
    }
    case 'character': {
      return { type: 'string', args: [column.character_maximum_length] };
    }
    case 'timestamp': {
      return { type: 'datetime', args: [{ useTz: false, precision: 6 }] };
    }
    case 'date': {
      return { type: 'date' };
    }
    case 'time': {
      return { type: 'time', args: [{ precision: 3 }] };
    }
    case 'numeric': {
      return { type: 'decimal', args: [10, 2] };
    }
    case 'real':
    case 'double': {
      return { type: 'double' };
    }
    case 'bigint': {
      return { type: 'bigInteger' };
    }
    case 'jsonb': {
      return { type: 'jsonb' };
    }
    default: {
      return { type: 'specificType', args: [column.data_type] };
    }
  }
};

const getIndexType = (index: RawIndex) => {
  if (index.is_primary) {
    return 'primary';
  }

  if (index.is_unique) {
    return 'unique';
  }
};

export default class PostgresqlSchemaInspector implements SchemaInspector {
  db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async getSchema() {
    const schema: Schema = { tables: [] };
    const dbSchema = this.getDatabaseSchema();

    const tables = await this.getTables();

    if (tables.length === 0) {
      return schema;
    }

    // Run 3 bulk queries in parallel instead of N+1 per-table queries
    const [allColumns, allIndexes, allForeignKeys] = await Promise.all([
      this.getBulkColumns(dbSchema, tables),
      this.getBulkIndexes(dbSchema, tables),
      this.getBulkForeignKeys(dbSchema, tables),
    ]);

    schema.tables = tables.map((tableName) => ({
      name: tableName,
      columns: allColumns.get(tableName) ?? [],
      indexes: allIndexes.get(tableName) ?? [],
      foreignKeys: allForeignKeys.get(tableName) ?? [],
    }));

    return schema;
  }

  getDatabaseSchema(): string {
    return this.db.getSchemaName() || 'public';
  }

  async getTables(): Promise<string[]> {
    const { rows } = await this.db.connection.raw<{ rows: RawTable[] }>(SQL_QUERIES.TABLE_LIST, [
      this.getDatabaseSchema(),
    ]);

    return rows.map((row) => row.table_name);
  }

  async getBulkColumns(dbSchema: string, tableNames: string[]): Promise<Map<string, Column[]>> {
    const { rows } = await this.db.connection.raw<{ rows: RawColumn[] }>(SQL_QUERIES.BULK_COLUMNS, [
      dbSchema,
      tableNames,
    ]);

    const result = new Map<string, Column[]>();

    for (const row of rows) {
      const { type, args = [], ...rest } = toStrapiType(row);
      const defaultTo =
        row.column_default && row.column_default.includes('nextval(') ? null : row.column_default;

      const column: Column = {
        type,
        args,
        defaultTo,
        name: row.column_name,
        notNullable: row.is_nullable === 'NO',
        unsigned: false,
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

  async getBulkIndexes(dbSchema: string, tableNames: string[]): Promise<Map<string, Index[]>> {
    const { rows } = await this.db.connection.raw<{ rows: RawIndex[] }>(SQL_QUERIES.BULK_INDEXES, [
      dbSchema,
      tableNames,
    ]);

    // Group by table, then by indexrelid
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

      const existing = tableIndexes.get(index.indexrelid);
      if (existing) {
        existing.columns.push(index.column_name);
      } else {
        tableIndexes.set(index.indexrelid, {
          columns: [index.column_name],
          name: index.index_name,
          type: getIndexType(index),
        });
      }
    }

    const result = new Map<string, Index[]>();
    for (const [tableName, tableIndexes] of byTable) {
      result.set(tableName, Array.from(tableIndexes.values()));
    }

    return result;
  }

  async getIndexes(tableName: string): Promise<Index[]> {
    const dbSchema = this.getDatabaseSchema();
    const result = await this.getBulkIndexes(dbSchema, [tableName]);
    return result.get(tableName) ?? [];
  }

  async getForeignKeys(tableName: string): Promise<ForeignKey[]> {
    const dbSchema = this.getDatabaseSchema();
    const result = await this.getBulkForeignKeys(dbSchema, [tableName]);
    return result.get(tableName) ?? [];
  }

  async getBulkForeignKeys(
    dbSchema: string,
    tableNames: string[]
  ): Promise<Map<string, ForeignKey[]>> {
    const { rows } = await this.db.connection.raw<{
      rows: Array<{
        table_name: string;
        constraint_name: string;
        column_name: string;
        on_update: string;
        on_delete: string;
        foreign_table: string;
        fk_column_name: string;
      }>;
    }>(SQL_QUERIES.BULK_FOREIGN_KEYS, [dbSchema, tableNames]);

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
          referencedColumns: [row.fk_column_name],
          referencedTable: row.foreign_table,
          onUpdate: row.on_update?.toUpperCase() ?? null,
          onDelete: row.on_delete?.toUpperCase() ?? null,
        };
        tableFKs.set(row.constraint_name, fk);
      } else {
        if (!fk.columns.includes(row.column_name)) {
          fk.columns.push(row.column_name);
        }
        if (!fk.referencedColumns.includes(row.fk_column_name)) {
          fk.referencedColumns.push(row.fk_column_name);
        }
      }
    }

    const result = new Map<string, ForeignKey[]>();
    for (const [tableName, tableFKs] of byTable) {
      result.set(tableName, Array.from(tableFKs.values()));
    }

    return result;
  }
}
