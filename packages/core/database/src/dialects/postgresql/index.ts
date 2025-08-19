import * as errors from '../../errors';
import type { Database } from '../..';
import Dialect from '../dialect';
import PostgresqlSchemaInspector from './schema-inspector';

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
    // Ideally we would rely on Knex config.searchPath to do this for us
    // However, createConnection must remain synchronous and if the user is using a connection function,
    // we do not know what their schema is until after the connection is resolved
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

  /**
   * Get column type conversion SQL with USING clause for PostgreSQL
   * @param currentType - The current PostgreSQL data type
   * @param targetType - The target Strapi type
   * @returns SQL string with USING clause or null if no special conversion needed
   */
  getColumnTypeConversionSQL(
    currentType: string,
    targetType: string
  ): {
    sql: string;
    typeClause: string;
    warning?: string;
  } | null {
    // Time to datetime conversion
    if (targetType === 'datetime' && currentType === 'time without time zone') {
      return {
        sql: `ALTER TABLE ?? ALTER COLUMN ?? TYPE timestamp(6) USING ('1970-01-01 ' || ??::text)::timestamp`,
        typeClause: 'timestamp(6)',
        warning:
          'Time values will be converted to datetime with default date "1970-01-01". Original time values will be preserved.',
      };
    }

    // Datetime to time conversion
    if (targetType === 'time' && currentType === 'timestamp without time zone') {
      return {
        sql: `ALTER TABLE ?? ALTER COLUMN ?? TYPE time(3) USING ??::time`,
        typeClause: 'time(3)',
        warning: 'Datetime values will be converted to time only. Date information will be lost.',
      };
    }

    // No special conversion needed
    return null;
  }
}
