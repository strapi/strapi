import type { Knex } from 'knex';

import path from 'node:path';

import { Dialect, getDialect } from './dialects';
import { createSchemaProvider, SchemaProvider } from './schema';
import { createMetadata, Metadata } from './metadata';
import { createEntityManager, EntityManager } from './entity-manager';
import { createMigrationsProvider, MigrationProvider, type Migration } from './migrations';
import { createLifecyclesProvider, LifecycleProvider } from './lifecycles';
import type { Event } from './lifecycles';
import { createConnection, createReadReplicaConnection, type ConnectionConfig } from './connection';
import * as errors from './errors';
import { Callback, transactionCtx, TransactionObject } from './transaction-context';
import { routingCtx } from './routing-context';
import { validateDatabase } from './validations';
import type { Model, JoinTable } from './types';
import type { Identifiers } from './utils/identifiers';
import { createRepairManager, type RepairManager } from './repairs';

export { isKnexQuery } from './utils/knex';

interface Settings {
  forceMigration?: boolean;
  runMigrations?: boolean;
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
  connection: ConnectionConfig;
  settings: Settings;
  logger?: Logger;
}

/**
 * Intent of a query, used to decide whether it may be served by a read replica.
 * `read` queries (SELECT/count/…) are replica-eligible; `write` queries are not.
 */
export type QueryIntent = 'read' | 'write';

/**
 * Per-query routing controls. `writer`/`replica` are explicit escape hatches
 * that override automatic routing (`replica` is still ignored inside a
 * transaction, where the writer must always be used).
 */
export interface RoutingOptions {
  intent?: QueryIntent;
  writer?: boolean;
  replica?: boolean;
}

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

  // Optional read-replica (reader endpoint) connection. Undefined unless a
  // `readReplica` is configured. Reads may be routed here to offload the writer.
  readConnection?: Knex;

  dialect: Dialect;

  config: DatabaseConfig;

  metadata: Metadata;

  schema: SchemaProvider;

  migrations: MigrationProvider;

  lifecycles: LifecycleProvider;

  entityManager: EntityManager;

  repair: RepairManager;

  logger: Logger;

  // Request-scoped read/write routing. Consumers (e.g. the HTTP server) wrap a
  // unit of work in `db.routing.run(cb)` to enable safe replica reads within it.
  // Only `run` is public; the dirty-tracking primitives stay module-internal so
  // external code can't silently defeat read-after-write safety.
  routing: Pick<typeof routingCtx, 'run'> = routingCtx;

  constructor(config: DatabaseConfig) {
    this.config = {
      ...config,
      settings: {
        forceMigration: true,
        runMigrations: true,
        ...(config.settings ?? {}),
      },
    };

    this.logger = config.logger ?? console;

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

    this.connection = createConnection(knexConfig, {
      pool: { afterCreate: afterCreate(this) },
    });

    // Reuse the same afterCreate wiring so the reader pool runs the same
    // per-connection dialect initialization (pg type parsers, search_path).
    this.readConnection = createReadReplicaConnection(this.config.connection, {
      pool: { afterCreate: afterCreate(this) },
    });

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
        await this.connection.client.acquireConnection();
      }
    }

    // Fail fast if a configured read replica is unreachable at startup.
    if (this.readConnection) {
      this.logger.debug('Verifying connection to the read replica');
      await this.readConnection.raw('SELECT 1');
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
    // A transaction implies a write, so pin the rest of this routing scope to
    // the writer even if the body only issues raw statements that bypass the
    // query-builder's own markDirty. Reads after commit stay consistent.
    routingCtx.markDirty();

    const notNestedTransaction = !transactionCtx.get();
    const trx = notNestedTransaction
      ? await this.connection.transaction()
      : (transactionCtx.get() as Knex.Transaction);

    async function commit() {
      if (notNestedTransaction) {
        await transactionCtx.commit(trx);
      }
    }

    async function rollback() {
      if (notNestedTransaction) {
        await transactionCtx.rollback(trx);
      }
    }

    if (!cb) {
      return { commit, rollback, get: () => trx };
    }

    return transactionCtx.run(trx, async () => {
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
        await rollback();
        throw error;
      }
    });
  }

  getSchemaName(): string | undefined {
    return this.connection.client.connectionSettings.schema;
  }

  /**
   * Decide whether a query may be served by the read replica. The writer is
   * always used unless every condition for safe replica reads holds: a replica
   * is configured, we are not inside a transaction, the caller has not forced
   * the writer, and either the caller forced the replica or this is a `read`
   * in a clean routing scope (no write has happened yet in this scope).
   */
  private shouldRouteToReplica(options?: RoutingOptions): boolean {
    if (!this.readConnection) {
      return false;
    }
    // Transactions must always run against the writer (read-your-writes).
    if (transactionCtx.get()) {
      return false;
    }
    if (options?.writer) {
      return false;
    }
    if (options?.replica) {
      return true;
    }
    if (options?.intent !== 'read') {
      return false;
    }
    return routingCtx.shouldUseReplica();
  }

  getConnection(): Knex;
  getConnection(tableName?: string, options?: RoutingOptions): Knex.QueryBuilder;
  getConnection(tableName?: string, options?: RoutingOptions): Knex | Knex.QueryBuilder {
    const knexConnection = this.shouldRouteToReplica(options)
      ? (this.readConnection as Knex)
      : this.connection;
    const schema = this.getSchemaName();
    const connection = tableName ? knexConnection(tableName) : knexConnection;
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

  async destroy() {
    await this.lifecycles.clear();
    // Ensure the reader pool is torn down even if destroying the writer throws.
    try {
      await this.connection.destroy();
    } finally {
      if (this.readConnection) {
        await this.readConnection.destroy();
      }
    }
  }
}

export { Database, errors };
export type { Model, JoinTable, Identifiers, Migration, Event };
