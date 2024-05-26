import * as errors from '../../errors';
import type { Database } from '../..';
import Dialect from '../dialect';
import CockroachDBSchemaInspector from './schema-inspector';

export default class CockroachDBDialect extends Dialect {
  schemaInspector: CockroachDBSchemaInspector;

  constructor(db: Database) {
    super(db, 'cockroachdb');

    this.schemaInspector = new CockroachDBSchemaInspector(db);
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
    // sets default int to 32 bit and sets serial normalization to sql_sequence to mimic postgres
    this.db.connection.client.pool.on('acquireSuccess', async (eventId: any, resource: any) => {
      resource.query('SET serial_normalization = "sql_sequence";');
      resource.query('SET default_int_size = 4;');
      resource.query('SET default_transaction_isolation = "READ COMMITTED";');
    });
    // If we're using a schema, set the default path for all table names in queries to use that schema
    const schemaName = this.db.getSchemaName();
    if (schemaName) {
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
