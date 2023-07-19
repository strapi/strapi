import path from 'path';
import fse from 'fs-extra';

import * as errors from '../../errors';
import Dialect from '../dialect';
import SqliteSchemaInspector from './schema-inspector';
import { Database } from '../..';

const UNSUPPORTED_OPERATORS = ['$jsonSupersetOf'];

export default class SqliteDialect extends Dialect {
  schemaInspector: SqliteSchemaInspector;

  constructor(db: Database) {
    super(db, 'sqlite');

    this.schemaInspector = new SqliteSchemaInspector(db);
  }

  configure() {
    this.db.config.connection.connection.filename = path.resolve(
      this.db.config.connection.connection.filename
    );

    const dbDir = path.dirname(this.db.config.connection.connection.filename);

    fse.ensureDirSync(dbDir);
  }

  useReturning() {
    return true;
  }

  async initialize() {
    await this.db.connection.raw('pragma foreign_keys = on');
  }

  canAlterConstraints() {
    return false;
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
