import type { Column, ForeignKey, Index, Schema } from '../../schema/types';
import type { SchemaInspector } from '../dialect';
import type { Database } from '../..';

interface RawTable {
  table_name: string;
}

interface RawColumn {
  data_type: string;
  column_name: string;
  character_maximum_length: number;
  column_default: string;
  is_nullable: string;
  column_type: string;
  column_key: string;
}

interface RawIndex {
  Key_name: string;
  Column_name: string;
  Non_unique: boolean | string;
}

interface RawForeignKey {
  constraint_name: string;
}

const SQL_QUERIES = {
  TABLE_LIST: /* sql */ `
    SELECT
      t.table_name as table_name
    FROM information_schema.tables t
    WHERE table_type = 'BASE TABLE'
    AND table_schema = schema();
  `,
  LIST_COLUMNS: /* sql */ `
    SELECT
      c.data_type as data_type,
      c.column_name as column_name,
      c.character_maximum_length as character_maximum_length,
      c.column_default as column_default,
      c.is_nullable as is_nullable,
      c.column_type as column_type,
      c.column_key as column_key
    FROM information_schema.columns c
    WHERE table_schema = database()
    AND table_name = ?;
  `,
  INDEX_LIST: /* sql */ `
    show index from ??;
  `,
  FOREIGN_KEY_LIST: /* sql */ `
    SELECT
      tc.constraint_name as constraint_name
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = database()
    AND tc.table_name = ?;
  `,
  FOREIGN_KEY_REFERENCES: /* sql */ `
    SELECT
      kcu.constraint_name as constraint_name,
      kcu.column_name as column_name,
      kcu.referenced_table_name as referenced_table_name,
      kcu.referenced_column_name as referenced_column_name
    FROM information_schema.key_column_usage kcu
    WHERE kcu.constraint_name in (?)
    AND kcu.table_schema = database()
    AND kcu.table_name = ?;
  `,
  FOREIGN_KEY_REFERENTIALS_CONSTRAINTS: /* sql */ `
    SELECT
      rc.constraint_name as constraint_name,
      rc.update_rule as on_update,
      rc.delete_rule as on_delete
    FROM information_schema.referential_constraints AS rc
    WHERE rc.constraint_name in (?)
    AND rc.constraint_schema = database()
    AND rc.table_name = ?;
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

    schema.tables = await Promise.all(
      tables.map(async (tableName) => {
        const columns = await this.getColumns(tableName);
        const indexes = await this.getIndexes(tableName);
        const foreignKeys = await this.getForeignKeys(tableName);

        return {
          name: tableName,
          columns,
          indexes,
          foreignKeys,
        };
      })
    );

    return schema;
  }

  async getTables(): Promise<string[]> {
    const [rows] = await this.db.connection.raw<[RawTable[]]>(SQL_QUERIES.TABLE_LIST);

    return rows.map((row) => row.table_name);
  }

  async getColumns(tableName: string): Promise<Column[]> {
    const [rows] = await this.db.connection.raw<[RawColumn[]]>(SQL_QUERIES.LIST_COLUMNS, [
      tableName,
    ]);

    return rows.map((row) => {
      const { type, args = [], ...rest } = toStrapiType(row);

      return {
        type,
        args,
        defaultTo: row.column_default,
        name: row.column_name,
        notNullable: row.is_nullable === 'NO',
        unsigned: row.column_type.endsWith(' unsigned'),
        ...rest,
      };
    });
  }

  async getIndexes(tableName: string): Promise<Index[]> {
    const [rows] = await this.db.connection.raw<[RawIndex[]]>(SQL_QUERIES.INDEX_LIST, [tableName]);

    const ret: Record<RawIndex['Key_name'], Index> = {};

    for (const index of rows) {
      if (index.Column_name === 'id') {
        continue;
      }

      if (!ret[index.Key_name]) {
        const indexInfo: Index = {
          columns: [index.Column_name],
          name: index.Key_name,
        };
        if (!index.Non_unique || index.Non_unique === '0') {
          indexInfo.type = 'unique';
        }

        ret[index.Key_name] = indexInfo;
      } else {
        ret[index.Key_name].columns.push(index.Column_name);
      }
    }

    return Object.values(ret);
  }

  async getForeignKeys(tableName: string): Promise<ForeignKey[]> {
    const [rows] = await this.db.connection.raw<[RawForeignKey[]]>(SQL_QUERIES.FOREIGN_KEY_LIST, [
      tableName,
    ]);

    const ret: Record<RawForeignKey['constraint_name'], ForeignKey> = {};

    for (const fk of rows) {
      ret[fk.constraint_name] = {
        name: fk.constraint_name,
        columns: [],
        referencedColumns: [],
        referencedTable: null,
        onUpdate: null,
        onDelete: null,
      } as unknown as ForeignKey;
    }

    const contraintNames = Object.keys(ret);

    if (contraintNames.length > 0) {
      const [fkReferences] = await this.db.connection.raw(SQL_QUERIES.FOREIGN_KEY_REFERENCES, [
        contraintNames,
        tableName,
      ]);

      for (const fkReference of fkReferences) {
        ret[fkReference.constraint_name].referencedTable = fkReference.referenced_table_name;
        ret[fkReference.constraint_name].columns.push(fkReference.column_name);
        ret[fkReference.constraint_name].referencedColumns.push(fkReference.referenced_column_name);
      }

      const [fkReferentialConstraints] = await this.db.connection.raw(
        SQL_QUERIES.FOREIGN_KEY_REFERENTIALS_CONSTRAINTS,
        [contraintNames, tableName]
      );

      for (const fkReferentialConstraint of fkReferentialConstraints) {
        ret[fkReferentialConstraint.constraint_name].onUpdate =
          fkReferentialConstraint.on_update.toUpperCase();
        ret[fkReferentialConstraint.constraint_name].onDelete =
          fkReferentialConstraint.on_delete.toUpperCase();
      }
    }

    return Object.values(ret);
  }
}
