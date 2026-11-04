import type { Knex } from 'knex';

import type { Database } from './database';

/** @internal Public through `@strapi/database` only. */
export type MigrationFn = (knex: Knex.Transaction, db: Database) => Promise<void>;

/** @internal Public through `@strapi/database` only. */
export type Migration = {
  name: string;
  up: MigrationFn;
  down: MigrationFn;
};

/** @internal Public through `@strapi/database` only. */
export interface InternalMigrationProvider {
  register(migration: Migration): void;
  shouldRun(): Promise<boolean>;
  up(): Promise<void>;
  down(): Promise<void>;
}

/** @internal Public through `@strapi/database` only. */
export interface MigrationProvider {
  providers: { internal: InternalMigrationProvider };
  createFileBuilder(): MigrationFileBuilder;
  shouldRun(): Promise<boolean>;
  up(): Promise<void>;
  down(): Promise<void>;
}

/** @internal Public through `@strapi/database` only. */
export interface BuiltMigrationFile {
  filename: string;
  content: string;
}

/** @internal Public through `@strapi/database` only. */
export interface RenameColumnOperation {
  table: string;
  from: string;
  to: string;
  comment?: string;
}

/** @internal Public through `@strapi/database` only. */
export interface RenameTableOperation {
  from: string;
  to: string;
  comment?: string;
}

/** @internal Public through `@strapi/database` only. */
export interface UpdateRowsOperation {
  table: string;
  where: Record<string, string>;
  set: Record<string, string>;
  guardColumn?: string;
  comment?: string;
}

/**
 * One logical operation per generated file: the composed `origin -> final`
 * attribute renames of every model that received hops, keyed by model uid.
 * Dispatched at runtime to the handlers registered on `db.schema` (e.g. admin
 * field permissions); the database package itself stores nothing by attribute
 * name.
 *
 * @internal Public through `@strapi/database` only.
 */
export interface AttributeRenamesOperation {
  renames: Record<string, Record<string, string>>;
  comment?: string;
}

/** @internal Public through `@strapi/database` only. */
export type MigrationFileOperation =
  | ({ kind: 'renameColumn' } & RenameColumnOperation)
  | ({ kind: 'renameTable' } & RenameTableOperation)
  | ({ kind: 'updateRows' } & UpdateRowsOperation)
  | ({ kind: 'attributeRenames' } & AttributeRenamesOperation);

/** @internal Public through `@strapi/database` only. */
export type MigrationFileFormat = 'javascript' | 'typescript';

/** @internal Public through `@strapi/database` only. */
export interface MigrationFileBuildOptions {
  name: string;
  /**
   * Module format of the generated file. `typescript` emits an ES module with
   * typed `up`/`down` signatures and a `.ts` extension so the app's `tsc` build
   * compiles it into `dist/database/migrations`, which is where migrations are
   * discovered when `useTypescriptMigrations` is enabled. Defaults to
   * `javascript` (CommonJS).
   */
  format?: MigrationFileFormat;
}

/** @internal Public through `@strapi/database` only. */
export interface MigrationFileWriteOptions extends MigrationFileBuildOptions {
  /**
   * Directory the migration file is written to. Defaults to the database's
   * configured migrations directory. The Content-Type Builder passes the app's
   * source `database/migrations` explicitly so the file is never written into
   * build output (e.g. `dist/` when `useTypescriptMigrations` is enabled).
   */
  dir?: string;
}

/** @internal Public through `@strapi/database` only. */
export interface MigrationFileBuilder {
  renameColumn(op: RenameColumnOperation): void;
  renameTable(op: RenameTableOperation): void;
  updateRows(op: UpdateRowsOperation): void;
  attributeRenames(op: AttributeRenamesOperation): void;
  hasChanges(): boolean;
  getOperations(): MigrationFileOperation[];
  build(options: MigrationFileBuildOptions, date?: Date): BuiltMigrationFile | null;
  writeFiles(options: MigrationFileWriteOptions): Promise<string | null>;
}
