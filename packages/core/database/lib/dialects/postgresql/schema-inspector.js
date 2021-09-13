'use strict';

const SQL_QUERIES = {
  TABLE_LIST: /* sql */ `
    SELECT *
    FROM information_schema.tables
    WHERE table_schema = ? AND table_type = 'BASE TABLE';
  `,
  LIST_COLUMNS: /* sql */ `
    SELECT *
    FROM information_schema.columns
    WHERE table_schema = ?
      AND table_name = ?;
  `,
  INDEX_LIST: /* sql */ `
    select
      ix.indexrelid,
      i.relname as index_name,
      a.attname as column_name,
      ix.indisunique as is_unique,
      ix.indisprimary as is_primary
    from
      pg_class t,
      pg_namespace s,
      pg_class i,
      pg_index ix,
      pg_attribute a
    where
      t.oid = ix.indrelid
      and i.oid = ix.indexrelid
      and a.attrelid = t.oid
      and a.attnum = ANY(ix.indkey)
      and t.relkind = 'r'
      and t.relnamespace = s.oid
      and s.nspname = ?
      and t.relname = ?;
  `,
  FOREIGN_KEY_LIST: /* sql */ `
    SELECT
      tco."constraint_name" as contraint_name,
      kcu."column_name" as column_name,
      rel_kcu."table_name" as foreign_table,
      rel_kcu."column_name" as fk_column_name,
      rco.update_rule as on_update,
      rco.delete_rule as on_delete,
      *
    FROM information_schema.table_constraints tco
    JOIN information_schema.key_column_usage kcu
      ON tco.constraint_schema = kcu.constraint_schema
      AND tco.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints rco
      ON tco.constraint_schema = rco.constraint_schema
      AND tco.constraint_name = rco.constraint_name
    JOIN information_schema.key_column_usage rel_kcu
      ON rco.unique_constraint_schema = rel_kcu.constraint_schema
      AND rco.unique_constraint_name = rel_kcu.constraint_name
      AND kcu.ordinal_position = rel_kcu.ordinal_position
    WHERE
      tco.constraint_type = 'FOREIGN KEY'
      AND tco.constraint_schema = ?
      AND tco.table_name = ?
    ORDER BY kcu.table_schema, kcu.table_name, kcu.ordinal_position, kcu.constraint_name;
  `,
};

const toStrapiType = column => {
  switch (column.data_type) {
    case 'integer': {
      return { type: 'integer' };
    }
    case 'character varying': {
      return { type: 'string', args: [column.character_maximum_length] };
    }
    default: {
      return { type: 'specificType', args: [column.data_type] };
    }
  }
};

class PostgresqlSchemaInspector {
  constructor(knex) {
    this.knex = knex;
  }

  async getSchema() {
    const schema = { tables: [] };
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

  getDatabaseSchema() {
    return this.knex.client.connectionSettings.schema || 'public';
  }

  async getTables() {
    const { rows } = await this.knex.raw(SQL_QUERIES.TABLE_LIST, [this.getDatabaseSchema()]);

    return rows.map(row => row.table_name);
  }

  async getColumns(tableName) {
    const { rows } = await this.knex.raw(SQL_QUERIES.LIST_COLUMNS, [
      this.getDatabaseSchema(),
      tableName,
    ]);

    // row.column_default.includes('nextval')

    return rows.map(row => {
      return {
        ...toStrapiType(row),
        name: row.column_name,
        sqlType: row.data_type,
        defaultTo: row.column_default, // TODO: handle non scalar values
        notNullable: row.is_nullable === 'NO',
        // primary: Boolean(row.pk),
        // unsigned: false,
        // autoincrement: false,
      };
    });
  }

  async getIndexes(tableName) {
    const { rows } = await this.knex.raw(SQL_QUERIES.INDEX_LIST, [
      this.getDatabaseSchema(),
      tableName,
    ]);

    const ret = {};

    for (const index of rows) {
      if (!ret[index.indexrelid]) {
        ret[index.indexrelid] = {
          columns: [index.column_name],
          name: index.index_name,
          // TODO: find other index types
          type: index.is_primary ? 'primary' : index.is_unique ? 'unique' : null,
        };
      } else {
        ret[index.indexrelid].columns.push(index.column_name);
      }
    }

    return Object.values(ret);
  }

  async getForeignKeys(tableName) {
    const { rows } = await this.knex.raw(SQL_QUERIES.FOREIGN_KEY_LIST, [
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
          onUpdate: fk.on_update.toLowerCase(),
          onDelete: fk.on_delete.toLowerCase(),
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
