'use strict';

const SQL_QUERIES = {
  TABLE_LIST: `select name from sqlite_master where type = 'table' and name NOT LIKE 'sqlite%'`,
  TABLE_INFO: `pragma table_info(??)`,
  INDEX_LIST: 'pragma index_list(??)',
  INDEX_INFO: 'pragma index_info(??)',
  FOREIGN_KEY_LIST: 'pragma foreign_key_list(??)',
};

const toStrapiType = (column) => {
  const { type } = column;

  const rootType = type.toLowerCase().match(/[^(), ]+/)[0];

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

class SqliteSchemaInspector {
  constructor(db) {
    this.db = db;
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

  async getTables() {
    const rows = await this.db.connection.raw(SQL_QUERIES.TABLE_LIST);

    return rows.map((row) => row.name);
  }

  async getColumns(tableName) {
    const rows = await this.db.connection.raw(SQL_QUERIES.TABLE_INFO, [tableName]);

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

  async getIndexes(tableName) {
    const indexes = await this.db.connection.raw(SQL_QUERIES.INDEX_LIST, [tableName]);

    const ret = [];

    for (const index of indexes.filter((index) => !index.name.startsWith('sqlite_'))) {
      const res = await this.db.connection.raw(SQL_QUERIES.INDEX_INFO, [index.name]);

      ret.push({
        columns: res.map((row) => row.name),
        name: index.name,
        type: index.unique ? 'unique' : null,
      });
    }

    return ret;
  }

  async getForeignKeys(tableName) {
    const fks = await this.db.connection.raw(SQL_QUERIES.FOREIGN_KEY_LIST, [tableName]);

    const ret = {};

    for (const fk of fks) {
      if (!ret[fk.id]) {
        ret[fk.id] = {
          // TODO: name, //  find name
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

module.exports = SqliteSchemaInspector;
