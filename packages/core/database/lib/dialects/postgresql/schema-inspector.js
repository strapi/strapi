'use strict';

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
  LIST_COLUMNS: /* sql */ `
    SELECT data_type, column_name, character_maximum_length, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_schema = ? AND table_name = ?;
  `,
  INDEX_LIST: /* sql */ `
    SELECT
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
      AND t.relname = ?;
  `,
  FOREIGN_KEY_LIST: /* sql */ `
   SELECT
      tco."constraint_name" as constraint_name,
      kcu."column_name" as column_name,
      kcu."table_name" as foreign_table,
      kcu."column_name" as fk_column_name,
      rco.update_rule as on_update,
      rco.delete_rule as on_delete
    FROM information_schema.table_constraints tco
    JOIN information_schema.key_column_usage kcu
      ON tco.constraint_schema = kcu.constraint_schema
      AND tco.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints rco
      ON tco.constraint_schema = rco.constraint_schema
      AND tco.constraint_name = rco.constraint_name
    WHERE
      tco.constraint_type = 'FOREIGN KEY'
      AND tco.constraint_schema = ?
      AND tco.table_name = ?
    ORDER BY kcu.table_schema, kcu.table_name, kcu.ordinal_position, kcu.constraint_name;
  `,
};

const toStrapiType = column => {
  const rootType = column.data_type.toLowerCase().match(/[^(), ]+/)[0];

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

class PostgresqlSchemaInspector {
  constructor(db) {
    this.db = db;
  }

  async getSchema() {
    const schema = { tables: [] };

    const tables = await this.getTables();

    schema.tables = await Promise.all(
      tables.map(async tableName => {
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

  getDatabaseSchema() {
    return this.db.connection.getSchemaName() || 'public';
  }

  async getTables() {
    const { rows } = await this.db.connection.raw(SQL_QUERIES.TABLE_LIST, [
      this.getDatabaseSchema(),
    ]);

    return rows.map(row => row.table_name);
  }

  async getColumns(tableName) {
    const { rows } = await this.db.connection.raw(SQL_QUERIES.LIST_COLUMNS, [
      this.getDatabaseSchema(),
      tableName,
    ]);

    return rows.map(row => {
      const { type, args = [], ...rest } = toStrapiType(row);

      const defaultTo =
        row.column_default && row.column_default.includes('nextval(') ? null : row.column_default;

      return {
        type,
        args,
        defaultTo,
        name: row.column_name,
        notNullable: row.is_nullable === 'NO',
        unsigned: false,
        ...rest,
      };
    });
  }

  async getIndexes(tableName) {
    const { rows } = await this.db.connection.raw(SQL_QUERIES.INDEX_LIST, [
      this.getDatabaseSchema(),
      tableName,
    ]);

    const ret = {};

    for (const index of rows) {
      if (index.column_name === 'id') {
        continue;
      }

      if (!ret[index.indexrelid]) {
        ret[index.indexrelid] = {
          columns: [index.column_name],
          name: index.index_name,
          type: index.is_primary ? 'primary' : index.is_unique ? 'unique' : null,
        };
      } else {
        ret[index.indexrelid].columns.push(index.column_name);
      }
    }

    return Object.values(ret);
  }

  async getForeignKeys(tableName) {
    const { rows } = await this.db.connection.raw(SQL_QUERIES.FOREIGN_KEY_LIST, [
      this.getDatabaseSchema(),
      tableName,
    ]);

    const ret = {};

    for (const fk of rows) {
      if (!ret[fk.constraint_name]) {
        ret[fk.constraint_name] = {
          name: fk.constraint_name,
          columns: [fk.column_name],
          referencedColumns: [fk.fk_column_name],
          referencedTable: fk.foreign_table,
          onUpdate: fk.on_update.toUpperCase(),
          onDelete: fk.on_delete.toUpperCase(),
        };
      } else {
        ret[fk.constraint_name].columns.push(fk.column_name);
        ret[fk.constraint_name].referencedColumns.push(fk.fk_column_name);
      }
    }

    return Object.values(ret);
  }
}

module.exports = PostgresqlSchemaInspector;