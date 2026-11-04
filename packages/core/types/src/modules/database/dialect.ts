import type { Knex } from 'knex';

import type { Database } from './database';
import type { SchemaInspector } from './schema';

/** @internal Public through `@strapi/database` only. */
export interface Dialect {
  db: Database;
  schemaInspector: SchemaInspector;
  client: string;
  configure(conn?: any): void;
  initialize(nativeConnection?: unknown): Promise<void>;
  getTables(): void;
  getSqlType(type: unknown): unknown;
  canAlterConstraints(): boolean;
  usesForeignKeys(): boolean;
  useReturning(): boolean;
  supportsUnsigned(): boolean;
  supportsOperator(operator?: string): boolean;
  startSchemaUpdate(): Promise<void>;
  endSchemaUpdate(): Promise<void>;
  transformErrors(error: Error | { message: string }): void;
  canAddIncrements(): boolean;
  canRenameSchemaObjects(): boolean;
  renameSchemaObject(
    trx: Knex,
    params: { table: string; from: string; to: string }
  ): Promise<boolean>;
  dropSchemaObject(trx: Knex, params: { table: string; name: string }): Promise<boolean>;
  getBatchInsertSize(): number;
  getColumnTypeConversionSQL(
    currentType: string,
    targetType: string
  ): { sql: string; typeClause: string; warning?: string } | null;
}
