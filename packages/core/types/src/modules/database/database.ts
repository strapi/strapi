import type { Knex } from 'knex';

import type { Dialect } from './dialect';
import type { EntityManager, Repository } from './entity-manager';
import type { LifecycleProvider } from './lifecycles';
import type { Metadata } from './metadata';
import type { MigrationProvider } from './migrations';
import type { Model } from './model';
import type { QueryBuilder } from './query';
import type { SchemaProvider } from './schema';

/** @internal Public through `@strapi/database` only. */
export interface Settings {
  forceMigration?: boolean;
  runMigrations?: boolean;
  /**
   * Describe the pool on knex connection pool timeouts (details on the error, a docs link, one
   * warning block per 30 s). Defaults to true; false leaves knex's error untouched. Must be a
   * boolean (for example `env.bool('DATABASE_POOL_TIMEOUT_DIAGNOSTICS', true)`): a string is not
   * read as false.
   */
  poolTimeoutDiagnostics?: boolean;
  migrations: {
    dir: string;
  };
  [key: string]: unknown;
}

/** @internal Public through `@strapi/database` only. */
export type Logger = Record<
  'info' | 'warn' | 'error' | 'debug',
  (message: string | Record<string, unknown>) => void
>;

/** @internal Public through `@strapi/database` only. */
export interface DatabaseConfig {
  connection: Knex.Config;
  settings: Settings;
  logger?: Logger;
  /** Lifecycle phase of the host application, e.g. "boot" or "runtime", for pool timeout reports. */
  getPhase?: () => string | undefined;
}

/** @internal Public through `@strapi/database` only. */
export type TransactionCallback = (...args: any[]) => Promise<any> | any;

/** @internal Public through `@strapi/database` only. */
export interface TransactionObject {
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  get: () => Knex.Transaction;
}

/** @internal Public through `@strapi/database` only. */
export interface RemoveOrphanMorphTypeOptions {
  pivot: string;
}

/** @internal Public through `@strapi/database` only. */
export interface RepairManager {
  removeOrphanMorphType: (arg: RemoveOrphanMorphTypeOptions) => Promise<void>;
  processUnidirectionalJoinTables: (
    arg: (db: Database, joinTableName: string, relation: any, sourceModel: any) => Promise<number>
  ) => Promise<number>;
}

/**
 * The database layer behind `strapi.db`.
 *
 * @internal Public through `@strapi/database` only.
 */
export interface Database {
  connection: Knex;
  dialect: Dialect;
  config: DatabaseConfig;
  metadata: Metadata;
  schema: SchemaProvider;
  migrations: MigrationProvider;
  lifecycles: LifecycleProvider;
  entityManager: EntityManager;
  repair: RepairManager;
  logger: Logger;

  init(params: { models: Model[] }): Promise<this>;

  query(uid: string): Repository;

  inTransaction(): boolean;

  /**
   * Labels pool timeout reports raised while `fn` runs, for example "schema sync".
   *
   * @internal
   */
  runInPhase<T>(phase: string, fn: () => Promise<T>): Promise<T>;

  /**
   * Run work inside a DB transaction. On a fulfilled callback, the transaction
   * is committed; on rejection, it is rolled back.
   */
  transaction(): Promise<TransactionObject>;
  transaction<TCallback extends TransactionCallback>(c: TCallback): Promise<ReturnType<TCallback>>;

  getSchemaName(): string | undefined;

  getConnection(): Knex;
  getConnection(tableName?: string): Knex.QueryBuilder;

  getInfo(): {
    displayName: string;
    schema: any;
    client: string;
  };

  getSchemaConnection(trx?: Knex): Knex.SchemaBuilder;

  queryBuilder(uid: string): QueryBuilder;

  destroy(): Promise<void>;
}
