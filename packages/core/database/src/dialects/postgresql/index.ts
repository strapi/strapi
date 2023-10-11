import * as errors from '../../errors';
import type { Database } from '../..';
import Dialect from '../dialect';
import PostgresqlSchemaInspector from './schema-inspector';

const schemaNamePattern = /^[a-zA-Z_][a-zA-Z0-9_\s]*$/;

export default class PostgresDialect extends Dialect {
  schemaInspector: PostgresqlSchemaInspector;

  constructor(db: Database) {
    super(db, 'postgres');
    this.schemaInspector = new PostgresqlSchemaInspector(db);
  }

  useReturning() {
    return true;
  }

  async initialize(nativeConnection: unknown) {
    // Don't cast DATE string to Date()
    this.db.connection.client.driver.types.setTypeParser(
      this.db.connection.client.driver.types.builtins.DATE,
      'text',
      (v: unknown) => v
    );
    // Don't parse JSONB automatically
    this.db.connection.client.driver.types.setTypeParser(
      this.db.connection.client.driver.types.builtins.JSONB,
      'text',
      (v: unknown) => v
    );
    this.db.connection.client.driver.types.setTypeParser(
      this.db.connection.client.driver.types.builtins.NUMERIC,
      'text',
      parseFloat
    );

    // If we're using a schema, set the default path for all table names in queries to use that schema
    const schemaName = this.db.getSchemaName();
    if (schemaName) {
      // Avoid running potentially dangerous schemaNames in our raw query
      if (!schemaNamePattern.test(schemaName)) {
        throw new Error('Invalid postgres schema name');
      }
      await this.db.connection
        .raw(`SET search_path TO "${schemaName}"`)
        .connection(nativeConnection);
    }
  }

  usesForeignKeys() {
    return true;
  }

  getSqlType(type: string) {
    switch (type) {
      case 'timestamp': {
        return 'datetime';
      }
      default: {
        return type;
      }
    }
  }

  transformErrors(error: NodeJS.ErrnoException) {
    switch (error.code) {
      case '23502': {
        throw new errors.NotNullError({
          column: 'column' in error ? `${error.column}` : undefined,
        });
      }
      default: {
        super.transformErrors(error);
      }
    }
  }
}
