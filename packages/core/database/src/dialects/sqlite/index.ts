import path from 'path';
import fse from 'fs-extra';
import type { Knex } from 'knex';

import * as errors from '../../errors';
import Dialect from '../dialect';
import SqliteSchemaInspector from './schema-inspector';
import type { Database } from '../..';

const UNSUPPORTED_OPERATORS = ['$jsonSupersetOf'];

/** SQLite compound SELECT limit (SQLITE_MAX_COMPOUND_SELECT); Knex batch insert uses UNION ALL per row. */
const SQLITE_BATCH_INSERT_SIZE = 500;

export default class SqliteDialect extends Dialect {
  schemaInspector: SqliteSchemaInspector;

  constructor(db: Database) {
    super(db, 'sqlite');

    this.schemaInspector = new SqliteSchemaInspector(db);
  }

  getBatchInsertSize(): number {
    return SQLITE_BATCH_INSERT_SIZE;
  }

  configure(conn?: Knex.Sqlite3ConnectionConfig) {
    const connection =
      conn || (this.db.config.connection.connection as Knex.Sqlite3ConnectionConfig);
    if (typeof connection !== 'string') {
      connection.filename = path.resolve(connection.filename);
    }

    const dbDir = path.dirname(connection.filename);

    fse.ensureDirSync(dbDir);
  }

  useReturning() {
    return true;
  }

  async initialize(nativeConnection: unknown) {
    await this.db.connection.raw('pragma foreign_keys = on').connection(nativeConnection);
  }

  canAlterConstraints() {
    return false;
  }

  /**
   * SQLite foreign keys are unnamed (declared inline on the table), so only
   * indexes need dropping. Queries run on `trx`: SQLite pools hold a single
   * connection, which the migration transaction already owns.
   */
  async dropSchemaObject(
    trx: Knex,
    { table, name }: { table: string; name: string }
  ): Promise<boolean> {
    const indexes: Array<{ name: string }> = await trx.raw('pragma index_list(??)', [table]);

    if (!indexes.some((index) => index.name === name)) {
      return false;
    }

    await trx.raw('DROP INDEX ??', [name]);
    return true;
  }

  getSqlType(type: string) {
    switch (type) {
      case 'enum': {
        return 'text';
      }
      case 'double':
      case 'decimal': {
        return 'float';
      }
      case 'timestamp': {
        return 'datetime';
      }
      default: {
        return type;
      }
    }
  }

  supportsOperator(operator: string) {
    return !UNSUPPORTED_OPERATORS.includes(operator);
  }

  async startSchemaUpdate() {
    await this.db.connection.raw(`pragma foreign_keys = off`);
  }

  async endSchemaUpdate() {
    await this.db.connection.raw(`pragma foreign_keys = on`);
  }

  transformErrors(error: NodeJS.ErrnoException) {
    switch (error.errno) {
      case 19: {
        throw new errors.NotNullError(); // TODO: extract column name
      }
      default: {
        super.transformErrors(error);
      }
    }
  }

  canAddIncrements() {
    return false;
  }
}
