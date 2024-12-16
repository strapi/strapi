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
}
