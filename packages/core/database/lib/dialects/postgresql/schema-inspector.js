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
      tco."constraint_name" as constraint_name
    FROM information_schema.table_constraints tco
    WHERE
      tco.constraint_type = 'FOREIGN KEY'
      AND tco.constraint_schema = ?
      AND tco.table_name = ?
  `,
  FOREIGN_KEY_REFERENCES: /* sql */ `
    SELECT
      kcu."constraint_name" as constraint_name,
      kcu."column_name" as column_name

    FROM information_schema.key_column_usage kcu
    WHERE kcu.constraint_name=ANY(?)
    AND kcu.table_schema = ?
    AND kcu.table_name = ?;
  `,

  FOREIGN_KEY_REFERENCES_CONSTRAIN: /* sql */ `
  SELECT
  rco.update_rule as on_update,
  rco.delete_rule as on_delete,
  rco."unique_constraint_name" as unique_constraint_name
  FROM information_schema.referential_constraints rco
  WHERE rco.constraint_name=ANY(?)
  AND rco.constraint_schema = ?
`,
  FOREIGN_KEY_REFERENCES_CONSTRAIN_RFERENCE: /* sql */ `
  SELECT
  rel_kcu."table_name" as foreign_table,
  rel_kcu."column_name" as fk_column_name
    FROM information_schema.key_column_usage rel_kcu
    WHERE rel_kcu.constraint_name=?
    AND rel_kcu.table_schema = ?
`,
  VERSION: /* sql */ `
    SELECT current_setting('server_version');
`,
};

const toStrapiType = (column) => {
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

const getIndexType = (index) => {
  if (index.is_primary) {
    return 'primary';
  }

  if (index.is_unique) {
    return 'unique';
  }

  return null;
};

class PostgresqlSchemaInspector {
  constructor(db) {
    this.db = db;
  }

  async getSchema() {
    const schema = { tables: [] };

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

  getDatabaseSchema() {
    return this.db.connection.getSchemaName() || 'public';
  }

  async getTables() {
    const { rows } = await this.db.connection.raw(SQL_QUERIES.TABLE_LIST, [
      this.getDatabaseSchema(),
    ]);

    return rows.map((row) => row.table_name);
  }

  async getColumns(tableName) {
    const { rows } = await this.db.connection.raw(SQL_QUERIES.LIST_COLUMNS, [
      this.getDatabaseSchema(),
      tableName,
    ]);

    return rows.map((row) => {
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
          type: getIndexType(index),
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
      ret[fk.constraint_name] = {
        name: fk.constraint_name,
        columns: [],
        referencedColumns: [],
        referencedTable: null,
        onUpdate: null,
        onDelete: null,
      };
    }
    const constraintNames = Object.keys(ret);
    const dbSchema = this.getDatabaseSchema();
    if (constraintNames.length > 0) {
      const { rows: fkReferences } = await this.db.connection.raw(
        SQL_QUERIES.FOREIGN_KEY_REFERENCES,
        [[constraintNames], dbSchema, tableName]
      );

      for (const fkReference of fkReferences) {
        ret[fkReference.constraint_name].columns.push(fkReference.column_name);

        const { rows: fkReferencesConstraint } = await this.db.connection.raw(
          SQL_QUERIES.FOREIGN_KEY_REFERENCES_CONSTRAIN,
          [[fkReference.constraint_name], dbSchema]
        );

        for (const fkReferenceC of fkReferencesConstraint) {
          const { rows: fkReferencesConstraintReferece } = await this.db.connection.raw(
            SQL_QUERIES.FOREIGN_KEY_REFERENCES_CONSTRAIN_RFERENCE,
            [fkReferenceC.unique_constraint_name, dbSchema]
          );
          for (const fkReferenceConst of fkReferencesConstraintReferece) {
            ret[fkReference.constraint_name].referencedTable = fkReferenceConst.foreign_table;
            ret[fkReference.constraint_name].referencedColumns.push(
              fkReferenceConst.fk_column_name
            );
          }
          ret[fkReference.constraint_name].onUpdate = fkReferenceC.on_update.toUpperCase();
          ret[fkReference.constraint_name].onDelete = fkReferenceC.on_delete.toUpperCase();
        }
      }
    }

    return Object.values(ret);
  }

  async getDatabaseInformation() {
    const { rows } = await this.db.connection.raw(SQL_QUERIES.VERSION);
    const version = rows[0].current_setting;

    return {
      database: 'Postgres',
      version: version.split(' ')[0],
    };
  }
}

module.exports = PostgresqlSchemaInspector;
