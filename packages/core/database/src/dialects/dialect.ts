import type { Knex } from 'knex';

import type { Database } from '..';
import type { ForeignKey, Index, Schema } from '../schema';

export interface SchemaInspector {
  getSchema(): Promise<Schema>;
  getIndexes(tableName: string): Promise<Index[]>;
  getForeignKeys(tableName: string): Promise<ForeignKey[]>;
  getTables(): Promise<string[]>;
}

export default class Dialect {
  db: Database;

  schemaInspector: SchemaInspector = {} as SchemaInspector;

  client: string;

  constructor(db: Database, client: string) {
    this.db = db;
    this.client = client;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configure(conn?: any) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(_nativeConnection?: unknown) {
    // noop
  }

  getTables() {
    throw new Error('getTables not implemented for this dialect');
  }

  getSqlType(type: unknown) {
    return type;
  }

  canAlterConstraints() {
    return true;
  }

  usesForeignKeys() {
    return false;
  }

  useReturning() {
    return false;
  }

  supportsUnsigned() {
    return false;
  }

  supportsOperator(operator?: string): boolean;
  supportsOperator(): boolean {
    return true;
  }

  async startSchemaUpdate() {
    // noop
  }

  async endSchemaUpdate() {
    // noop
  }

  transformErrors(error: Error | { message: string }) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(error.message);
  }

  canAddIncrements() {
    return true;
  }

  /**
   * Whether indexes and constraints can be renamed in place (used by the rename
   * migration helpers to keep index/constraint names in sync with a renamed
   * column or table). When false, schema sync drops and recreates them by name.
   */
  canRenameSchemaObjects() {
    return false;
  }

  /**
   * Renames the index or constraint `from` on `table` to `to`, if it exists and
   * `to` is free. Runs on the given transaction. Returns whether a rename happened.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async renameSchemaObject(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    trx: Knex,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    params: { table: string; from: string; to: string }
  ): Promise<boolean> {
    return false;
  }

  /**
   * Max rows per batch for bulk inserts.
   * Some databases limit multi-row insert size; override in dialect when a lower limit is required.
   */
  getBatchInsertSize(): number {
    return 1000;
  }

  /**
   * Get column type conversion SQL for complex type changes
   * Override in specific dialects to handle database-specific conversions
   * @param currentType - The current database data type
   * @param targetType - The target Strapi type
   * @returns Conversion SQL details or null if no special handling needed
   */
  getColumnTypeConversionSQL(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    currentType: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    targetType: string
  ): { sql: string; typeClause: string; warning?: string } | null {
    return null;
  }
}
