import type { Knex } from 'knex';

import type {
  AttributeRenamesOperation,
  RenameColumnOperation,
  RenameTableOperation,
  UpdateRowsOperation,
} from './migrations';

/** @internal Public through `@strapi/database` only. */
export interface Schema {
  tables: Table[];
}

/** @internal Public through `@strapi/database` only. */
export interface Table {
  name: string;
  columns: Column[];
  indexes: Index[];
  foreignKeys: ForeignKey[];
}

/** @internal Public through `@strapi/database` only. */
export interface Column {
  type: string;
  name: string;
  args?: unknown[];
  defaultTo?: any;
  notNullable?: boolean | null;
  unsigned?: boolean;
  unique?: boolean;
  primary?: boolean;
}

/** @internal Public through `@strapi/database` only. */
export type IndexType = 'primary' | 'unique';

/** @internal Public through `@strapi/database` only. */
export interface Index {
  columns: string[];
  name: string;
  type?: IndexType;
}

/** @internal Public through `@strapi/database` only. */
export interface ForeignKey {
  name: string;
  columns: string[];
  referencedColumns: string[];
  referencedTable: string;
  onUpdate?: string | null;
  onDelete?: string | null;
}

/** @internal Public through `@strapi/database` only. */
export interface IndexDiff {
  status: 'CHANGED' | 'UNCHANGED';
  diff: {
    name: string;
    object: Index;
  };
}

/** @internal Public through `@strapi/database` only. */
export interface ColumnDiff {
  status: 'CHANGED' | 'UNCHANGED';
  diff: {
    name: string;
    object: Column;
  };
}

/** @internal Public through `@strapi/database` only. */
export interface ColumnsDiff {
  status: 'CHANGED' | 'UNCHANGED';
  diff: {
    added: Column[];
    removed: Column[];
    updated: ColumnDiff['diff'][];
    unchanged: Column[];
  };
}

/** @internal Public through `@strapi/database` only. */
export interface ForeignKeyDiff {
  status: 'CHANGED' | 'UNCHANGED';
  diff: {
    name: string;
    object: ForeignKey;
  };
}

/** @internal Public through `@strapi/database` only. */
export interface ForeignKeysDiff {
  status: 'CHANGED' | 'UNCHANGED';
  diff: {
    added: ForeignKey[];
    updated: ForeignKeyDiff['diff'][];
    unchanged: ForeignKey[];
    removed: ForeignKey[];
  };
}

/** @internal Public through `@strapi/database` only. */
export interface IndexesDiff {
  status: 'CHANGED' | 'UNCHANGED';
  diff: {
    added: Index[];
    updated: IndexDiff['diff'][];
    unchanged: Index[];
    removed: Index[];
  };
}

/** @internal Public through `@strapi/database` only. */
export interface TableDiff {
  status: 'CHANGED' | 'UNCHANGED';
  diff: {
    name: string;
    indexes: IndexesDiff['diff'];
    columns: ColumnsDiff['diff'];
    foreignKeys: ForeignKeysDiff['diff'];
  };
}

/** @internal Public through `@strapi/database` only. */
export interface TablesDiff {
  added: Table[];
  removed: Table[];
  updated: Array<TableDiff['diff']>;
  unchanged: Table[];
}

/** @internal Public through `@strapi/database` only. */
export interface SchemaDiff {
  status: 'CHANGED' | 'UNCHANGED';
  diff: {
    tables: TablesDiff;
  };
}

/** @internal Public through `@strapi/database` only. */
export interface SchemaDiffContext {
  previousSchema?: Schema;
  databaseSchema: Schema;
  userSchema: Schema;
}

/** @internal Public through `@strapi/database` only. */
export interface SchemaInspector {
  getSchema(): Promise<Schema>;
  getIndexes(tableName: string): Promise<Index[]>;
  getForeignKeys(tableName: string): Promise<ForeignKey[]>;
  getTables(): Promise<string[]>;
}

/** @internal Public through `@strapi/database` only. */
export interface SchemaBuilder {
  getSchemaBuilder(trx: Knex.Transaction): Knex.SchemaBuilder;
  createSchema(schema: Schema): Promise<void>;
  createTables(tables: Table[], trx: Knex.Transaction): Promise<void>;
  dropSchema(schema: Schema, options?: { dropDatabase?: boolean | undefined }): Promise<void>;
  updateSchema(schemaDiff: SchemaDiff['diff']): Promise<void>;
}

/** @internal Public through `@strapi/database` only. */
export interface SchemaDiffer {
  diff: (schemaDiffCtx: SchemaDiffContext) => Promise<SchemaDiff>;
}

/** @internal Public through `@strapi/database` only. */
export interface SchemaStorage {
  read(): Promise<{
    id: number;
    time: Date;
    hash: string;
    schema: Schema;
  } | null>;
  hashSchema(schema: Schema): string;
  add(schema: Schema): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Attribute renames of one save, composed per model: `uid -> { origin: final }`.
 *
 * @internal Public through `@strapi/database` only.
 */
export interface AttributeRenames {
  renames: Record<string, Record<string, string>>;
  comment?: string;
}

/**
 * Updates a store keyed by attribute name (e.g. admin field permissions) for
 * the given renames. Runs inside the migration transaction `trx`.
 *
 * @internal Public through `@strapi/database` only.
 */
export type AttributeRenameHandler = (
  trx: Knex,
  renames: AttributeRenames['renames']
) => Promise<void>;

/**
 * Runtime helpers used by generated rename migrations.
 *
 * @internal Public through `@strapi/database` only.
 */
export interface RenameHelpers {
  renameColumn(trx: Knex, op: RenameColumnOperation): Promise<boolean>;
  renameTable(trx: Knex, op: RenameTableOperation): Promise<boolean>;
  updateRows(trx: Knex, op: UpdateRowsOperation): Promise<boolean>;
  registerAttributeRenameHandler(handler: AttributeRenameHandler): () => void;
  applyAttributeRenames(trx: Knex, op: AttributeRenamesOperation): Promise<boolean>;
}

/** @internal Public through `@strapi/database` only. */
export interface SchemaProvider extends RenameHelpers {
  builder: SchemaBuilder;
  schemaDiff: SchemaDiffer;
  schemaStorage: SchemaStorage;
  sync(): Promise<SchemaDiff['status']>;
  syncSchema(): Promise<SchemaDiff['status']>;
  reset(): Promise<void>;
  create(): Promise<void>;
  drop(): Promise<void>;
  schema: Schema;
}
