import type { Knex } from 'knex';

import path from 'node:path';

import { Dialect, getDialect } from './dialects';
import { createSchemaProvider, SchemaProvider } from './schema';
import { createMetadata, Metadata } from './metadata';
import { createEntityManager, EntityManager } from './entity-manager';
import { createMigrationsProvider, MigrationProvider } from './migrations';
import { createLifecyclesProvider, LifecycleProvider } from './lifecycles';
import { createConnection } from './connection';
import * as errors from './errors';
import {
  Callback,
  isDeadlockError,
  isFinalisedTransactionError,
  recordErrorIfTransactorFinalised,
  transactionCtx,
  TransactionObject,
  waitForDeadlockRetry,
} from './transaction-context';
import { validateDatabase } from './validations';
import { appendCallerStack } from './utils/async-stack';
import type { Model } from './types';
import { createRepairManager, type RepairManager } from './repairs';
import { installPoolDiagnostics, type PoolDiagnostics } from './pool-diagnostics';
import { withStrapiKnexLog } from './utils/knex-log';

/**
 * Commit and rollback hooks run after the transaction has already settled.
 * Log a useful message for Error instances and for thrown non-errors.
 */
const formatHookError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    const serialized = JSON.stringify(error);
    return typeof serialized === 'string' ? serialized : '';
  } catch {
    // Circular values have no JSON form.
    return 'Unserializable value';
  }
};

/** Drivers and hooks can reject with any value. Callers receive an Error. */
const asThrownError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const DOCUMENT_LOCK_TABLE = 'strapi_document_locks';

export { isKnexQuery } from './utils/knex';
export { isDatabaseClientKind } from './connection';
export { attributeNaming } from './metadata';
export { createField } from './fields';
export type { AttributeNaming, Meta } from './metadata';
export type {
  AttributeRenamesOperation,
  Migration,
  BuiltMigrationFile,
  MigrationFileBuilder,
  MigrationFileFormat,
  MigrationFileOperation,
} from './migrations';
export type { Event } from './lifecycles';
export type { Attribute, Model, JoinTable } from './types';
export type { AttributeRenameHandler, AttributeRenames } from './schema';
export type { Identifiers } from './utils/identifiers';
export { POOL_TIMEOUT_CODE } from './pool-diagnostics';
export type {
  EventLoopDelay,
  PoolDiagnostics,
  PoolState,
  PoolTimeoutDetails,
} from './pool-diagnostics';

interface Settings {
  forceMigration?: boolean;
  runMigrations?: boolean;
  /**
   * Describe the pool on knex connection pool timeouts (details on the error, a docs link, one
   * warning block per 30 s). Defaults to true; false leaves knex's error untouched. Must be a
   * boolean (for example `env.bool('DATABASE_POOL_TIMEOUT_DIAGNOSTICS', true)`): a string is not
   * read as false.
   */
  poolTimeoutDiagnostics?: boolean;
  /**
   * Maximum time in milliseconds a query run through the query builder's `execute()` may run
   * before the database cancels it. Unset by default (no limit). Only applied on clients that
   * can cancel queries (postgres, mysql); ignored on sqlite. Streams, direct `db.connection`
   * queries, schema sync, and migrations are not covered. Must be a positive number (for
   * example `env.int('DATABASE_QUERY_TIMEOUT')`).
   */
  queryTimeout?: number;
  migrations: {
    dir: string;
  };
  [key: string]: unknown;
}

export type Logger = Record<
  'info' | 'warn' | 'error' | 'debug',
  (message: string | Record<string, unknown>) => void
>;

export interface DatabaseConfig {
  connection: Knex.Config;
  settings: Settings;
  logger?: Logger;
  /** Lifecycle phase of the host application, e.g. "boot" or "runtime", for pool timeout reports. */
  getPhase?: () => string | undefined;
}

const assertValidQueryTimeout = (queryTimeout: unknown) => {
  if (queryTimeout === undefined) {
    return;
  }

  // A string (e.g. a raw `env('DATABASE_QUERY_TIMEOUT')`) would be silently ignored by knex, leaving
  // users thinking they are protected when they are not
  if (typeof queryTimeout !== 'number' || !Number.isFinite(queryTimeout) || queryTimeout <= 0) {
    // JSON.stringify keeps strings quoted ("5000" vs 5000) but turns NaN and Infinity into null
    const received =
      typeof queryTimeout === 'string' ? JSON.stringify(queryTimeout) : String(queryTimeout);

    throw new Error(
      `Invalid database setting "queryTimeout": expected a positive number of milliseconds, received ${received}. Use env.int() when reading it from an environment variable.`
    );
  }
};

const afterCreate =
  (db: Database) =>
  (
    nativeConnection: unknown,
    done: (error: Error | null, nativeConnection: unknown) => Promise<void>
  ) => {
    // run initialize for it since commands such as postgres SET and sqlite PRAGMA are per-connection
    db.dialect.initialize(nativeConnection).then(() => {
      return done(null, nativeConnection);
    });
  };

class Database {
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

  /** Set unless `settings.poolTimeoutDiagnostics` is false or the install failed. */
  private poolDiagnostics?: PoolDiagnostics;

  private phase?: string;

  /** Document ids whose MySQL lock row each open transaction already holds. */
  private heldDocumentLocks = new WeakMap<Knex.Transaction, Set<string>>();

  constructor(config: DatabaseConfig) {
    this.config = {
      ...config,
      settings: {
        forceMigration: true,
        runMigrations: true,
        ...config.settings,
      },
    };

    this.logger = config.logger ?? console;

    assertValidQueryTimeout(this.config.settings.queryTimeout);

    this.dialect = getDialect(this);

    let knexConfig: Knex.Config = this.config.connection;

    // for object connections, we can configure the dialect synchronously
    if (typeof this.config.connection.connection !== 'function') {
      this.dialect.configure();
    }
    // for connection functions, we wrap it so that we can modify it with dialect configure before it reaches knex
    else {
      this.logger.warn(
        'Knex connection functions are currently experimental. Attempting to access the connection object before database initialization will result in errors.'
      );

      knexConfig = {
        ...this.config.connection,
        connection: async () => {
          // @ts-expect-error confirmed it was a function above
          const conn = await this.config.connection.connection();
          this.dialect.configure(conn);
          return conn;
        },
      };
    }

    this.metadata = createMetadata([]);

    this.connection = createConnection(withStrapiKnexLog(knexConfig, this.logger), {
      pool: { afterCreate: afterCreate(this) },
    });

    if (this.config.settings.poolTimeoutDiagnostics !== false) {
      try {
        this.poolDiagnostics = installPoolDiagnostics(this.connection, {
          logger: { warn: (message) => this.logger.warn(message) },
          getPhase: () => this.phase ?? this.config.getPhase?.(),
        });
      } catch (error) {
        // Diagnostics are optional: failing to install them must not stop the application booting
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.debug(`[database] pool timeout diagnostics not installed: ${reason}`);
      }
    }

    this.schema = createSchemaProvider(this);

    this.migrations = createMigrationsProvider(this);
    this.lifecycles = createLifecyclesProvider(this);

    this.entityManager = createEntityManager(this);

    this.repair = createRepairManager(this);
  }

  async init({ models }: { models: Model[] }) {
    if (typeof this.config.connection.connection === 'function') {
      /*
       * User code needs to be able to access `connection.connection` directly as if
       * it were always an object. For a connection function, that doesn't happen
       * until the pool is created, so we need to do that here
       *
       * TODO: In the next major version, we need to replace all internal code that
       * directly references `connection.connection` prior to init, and make a breaking
       * change that it cannot be relied on to exist before init so that we can call
       * this feature stable.
       */
      this.logger.debug('Forcing Knex to make real connection to db');

      // sqlite does not support connection pooling so acquireConnection doesn't work
      if (this.config.connection.client === 'sqlite') {
        await this.connection.raw('SELECT 1');
      } else {
        // release it straight away, otherwise it holds a pool slot for the life of the process
        const conn = await this.connection.client.acquireConnection();
        await this.connection.client.releaseConnection(conn);
      }
    }

    this.metadata.loadModels(models);
    await validateDatabase(this);
    return this;
  }

  query(uid: string) {
    if (!this.metadata.has(uid)) {
      throw new Error(`Model ${uid} not found`);
    }

    return this.entityManager.getRepository(uid);
  }

  inTransaction() {
    return !!transactionCtx.get();
  }

  /**
   * Labels pool timeout reports raised while `fn` runs, for example "schema sync". Nested calls
   * restore the outer label. Calls that overlap without nesting can restore the wrong label; core
   * only nests them (schema sync, then a migration).
   *
   * The label is process-wide, not per call: a call made at runtime relabels every concurrent
   * timeout report until it returns. It is meant for boot-time work (schema sync, migrations).
   *
   * @internal
   */
  async runInPhase<T>(phase: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.phase;
    this.phase = phase;

    try {
      return await fn();
    } finally {
      this.phase = previous;
    }
  }

  /**
   * Run work inside a DB transaction. On a fulfilled callback, the transaction
   * is committed; on rejection, it is rolled back. The callback receives Knex
   * `commit` and `rollback` helpers: if you call `rollback` and return without
   * throwing, the implementation avoids attempting a second `commit` on an
   * already-finalised transactor.
   */
  transaction(): Promise<TransactionObject>;
  transaction<TCallback extends Callback>(c: TCallback): Promise<ReturnType<TCallback>>;
  async transaction<TCallback extends Callback>(
    cb?: TCallback
  ): Promise<ReturnType<TCallback> | TransactionObject> {
    // Postgres and MySQL abort one transaction when two of them deadlock, and
    // the caller has to run it again. Nested work is not retried on its own:
    // the outer transaction is already aborted, so the outermost callback
    // runs again. Commit and rollback hooks are not awaited here, so their
    // errors never reach this loop. A deadlock after the handler has
    // already called commit or rollback is not retried either.
    const nested = !!transactionCtx.get();
    const attempts = nested ? 1 : 3;

    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await this.runTransaction(cb);
      } catch (error) {
        lastError = error;
        if (
          nested ||
          attempt === attempts ||
          isFinalisedTransactionError(error) ||
          !isDeadlockError(error)
        ) {
          throw error;
        }

        await waitForDeadlockRetry(attempt);
      }
    }

    throw lastError;
  }

  private async runTransaction<TCallback extends Callback>(
    cb?: TCallback
  ): Promise<ReturnType<TCallback> | TransactionObject> {
    const notNestedTransaction = !transactionCtx.get();
    const trx = notNestedTransaction
      ? await this.startTransaction()
      : (transactionCtx.get() as Knex.Transaction);
    const logger = this.logger;

    async function commit() {
      if (notNestedTransaction) {
        await transactionCtx.commit(trx, (error) => {
          logger.error(
            `Commit hook failed after the transaction committed: ${formatHookError(error)}`
          );
        });
      }
    }

    async function rollback() {
      if (notNestedTransaction) {
        await transactionCtx.rollback(trx, (error) => {
          logger.error(
            `Rollback hook failed after the transaction rolled back: ${formatHookError(error)}`
          );
        });
      }
    }

    if (!cb) {
      return { commit, rollback, get: () => trx };
    }

    return await transactionCtx.run(
      trx,
      async () => {
        try {
          const callbackParams = {
            trx,
            commit,
            rollback,
            onCommit: transactionCtx.onCommit,
            onRollback: transactionCtx.onRollback,
          };
          const res = await cb(callbackParams);
          await commit();
          return res;
        } catch (error) {
          // Read this before rollback(). Rolling back an open transaction also
          // completes it, and that path must stay retryable.
          recordErrorIfTransactorFinalised(trx, error);
          await rollback();
          throw error;
        }
      },
      this
    );
  }

  /**
   * Runs `cb` in a savepoint of the current transaction, so a failure undoes only `cb`'s writes.
   * If `cb` throws, its writes are rolled back, the `onCommit` callbacks registered in it are
   * dropped, its `onRollback` callbacks run, and the error is rethrown. A failing `onRollback`
   * callback is logged and does not replace that error. The callbacks after it do not run. The
   * transaction stays usable, on Postgres also after a database error, but not after a MySQL
   * deadlock, which rolls back the whole transaction: the savepoint then can't be rolled back
   * to, and it throws an `errors.SavepointError`, as when it can't be released. Throws if called
   * outside a transaction.
   */
  savepoint<T>(cb: () => Promise<T> | T): Promise<T> {
    return transactionCtx.savepoint(cb, (error) => {
      this.logger.error(
        `Rollback hook failed after the transaction rolled back: ${formatHookError(error)}`
      );
    });
  }

  /**
   * Starts a top-level knex transaction. knex resolves it through a promise chain that async stack
   * traces cannot follow, so on failure the stack is extended with the frames of our callers.
   */
  private async startTransaction(): Promise<Knex.Transaction> {
    try {
      return await this.connection.transaction();
    } catch (error) {
      appendCallerStack(error);
      throw error;
    }
  }

  getSchemaName(): string | undefined {
    return this.connection.client.connectionSettings.schema;
  }

  getConnection(): Knex;
  getConnection(tableName?: string): Knex.QueryBuilder;
  getConnection(tableName?: string): Knex | Knex.QueryBuilder {
    const schema = this.getSchemaName();
    const connection = tableName ? this.connection(tableName) : this.connection;
    return schema ? connection.withSchema(schema) : connection;
  }

  // Returns basic info about the database connection
  getInfo() {
    const connectionSettings = this.connection?.client?.connectionSettings || {};
    const client = this.dialect?.client || '';

    let displayName = '';
    let schema;

    // For SQLite, get the relative filename
    if (client === 'sqlite') {
      const absolutePath = connectionSettings?.filename;
      if (absolutePath) {
        displayName = path.relative(process.cwd(), absolutePath);
      }
    }
    // For other dialects, get the database name
    else {
      displayName = connectionSettings?.database;
      schema = connectionSettings?.schema;
    }

    return {
      displayName,
      schema,
      client,
    };
  }

  getSchemaConnection(trx = this.connection) {
    const schema = this.getSchemaName();
    return schema ? trx.schema.withSchema(schema) : trx.schema;
  }

  queryBuilder(uid: string) {
    return this.entityManager.createQueryBuilder(uid);
  }

  /**
   * Wait for `onCommit` and `onRollback` hooks still running on this database.
   * The transaction call itself does not wait, so a test that reads a hook's
   * side effect does. `destroy()` stops waiting after 10 seconds.
   */
  settleTransactionHooks(timeoutMs?: number) {
    return transactionCtx.settleHooks(this, timeoutMs);
  }

  /**
   * Serialize MySQL writers of one document on a sentinel row. No-op on other
   * dialects. REPEATABLE READ fixes a transaction's snapshot at its first read,
   * so a transaction that reads the document and then writes it must call this
   * before that first read. Later calls in the same transaction do nothing.
   */
  async lockDocumentId(documentId: string) {
    if (this.dialect.client !== 'mysql') {
      return;
    }

    const trx = transactionCtx.get();
    if (trx && this.heldDocumentLocks.get(trx)?.has(documentId)) {
      return;
    }

    const insert = this.getConnection(DOCUMENT_LOCK_TABLE)
      .insert({ document_id: documentId })
      .onConflict('document_id')
      // INSERT IGNORE leaves concurrent writers with a shared lock on a duplicate
      // row. They then deadlock while both upgrade it in the SELECT FOR UPDATE below.
      // A no-op duplicate-key update acquires the exclusive row lock immediately.
      .merge({ document_id: documentId });

    if (trx) {
      insert.transacting(trx);
    }

    // The insert or duplicate-key update already holds the exclusive lock
    // until the transaction completes.
    await insert;

    if (trx) {
      const held = this.heldDocumentLocks.get(trx) ?? new Set<string>();
      held.add(documentId);
      this.heldDocumentLocks.set(trx, held);
    }
  }

  /**
   * Remove the lock row of a document that no longer exists, or never did.
   * Without this, updates of made-up ids and deleted documents leave rows behind.
   */
  async deleteDocumentLock(documentId: string) {
    if (this.dialect.client !== 'mysql') {
      return;
    }

    const trx = transactionCtx.get();
    const remove = this.getConnection(DOCUMENT_LOCK_TABLE)
      .where({ document_id: documentId })
      .delete();

    if (trx) {
      remove.transacting(trx);
    }

    await remove;

    // The row is gone, so a later write in this transaction has to insert it again.
    if (trx) {
      this.heldDocumentLocks.get(trx)?.delete(documentId);
    }
  }

  async destroy() {
    // A commit hook can still write. Timestamp and model subscribers have to
    // stay registered until that write finishes. Clearing them first stores
    // the row with NULL createdAt and updatedAt.
    let drained = true;
    let settleError: unknown;
    let failedToSettle = false;
    try {
      drained = await this.settleTransactionHooks();
    } catch (error) {
      failedToSettle = true;
      settleError = error;
    }

    try {
      await this.lifecycles.clear();
    } finally {
      this.poolDiagnostics?.dispose();
    }

    // Close the pool before reporting a drain failure. Throwing from `finally`
    // hides a close failure, and lint rejects that throw.
    let closeError: unknown;
    let failedToClose = false;
    try {
      if (!drained) {
        this.logger.warn('Closing the database connection with transaction hooks still running');
      }
      await this.connection.destroy();
    } catch (error) {
      failedToClose = true;
      closeError = error;
    }

    if (failedToSettle) {
      throw asThrownError(settleError);
    }

    if (failedToClose) {
      throw asThrownError(closeError);
    }
  }
}

export { Database, errors };
