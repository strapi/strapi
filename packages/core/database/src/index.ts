import type { Knex } from 'knex';

import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { Dialect, getDialect } from './dialects';
import { createSchemaProvider, SchemaProvider } from './schema';
import { createMetadata, Metadata } from './metadata';
import { createEntityManager, EntityManager } from './entity-manager';
import { createMigrationsProvider, MigrationProvider, type Migration } from './migrations';
import { createLifecyclesProvider, LifecycleProvider } from './lifecycles';
import { createConnection } from './connection';
import * as errors from './errors';
import { Callback, transactionCtx, TransactionObject } from './transaction-context';
import { validateDatabase } from './validations';
import type { Model, JoinTable } from './types';
import type { Identifiers } from './utils/identifiers';
import { createRepairManager, type RepairManager } from './repairs';
import {
  DatabasePerformanceConfig,
  DatabasePerformanceSubscriber,
  DatabaseQueryPerfEvent,
  DEFAULT_DATABASE_PERFORMANCE_CONFIG,
  normalizeSqlFingerprint,
  toQueryType,
} from './performance';

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
  connection: Knex.Config;
  settings: Settings;
  logger?: Logger;
  performance?: DatabasePerformanceConfig;
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

  dialect: Dialect;

  config: DatabaseConfig;

  metadata: Metadata;

  schema: SchemaProvider;

  migrations: MigrationProvider;

  lifecycles: LifecycleProvider;

  entityManager: EntityManager;

  repair: RepairManager;

  logger: Logger;

  performance: Required<DatabasePerformanceConfig>;

  private performanceSubscribers = new Set<DatabasePerformanceSubscriber>();

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
    const perfFromUser = { ...(config.performance ?? {}) };
    // Sink-only keys (read by core) must not live on `@strapi/database` runtime perf config.
    delete (perfFromUser as DatabasePerformanceConfig & { output?: unknown }).output;
    this.performance = {
      ...DEFAULT_DATABASE_PERFORMANCE_CONFIG,
      ...perfFromUser,
    };

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
    this.registerPerformanceListeners();

    this.schema = createSchemaProvider(this);

    this.migrations = createMigrationsProvider(this);
    this.lifecycles = createLifecyclesProvider(this);

    this.entityManager = createEntityManager(this);

    this.repair = createRepairManager(this);
  }

  private registerPerformanceListeners() {
    if (!this.performance.enabled) {
      return;
    }

    const inflightQueries = new Map<
      string,
      {
        startedAt: number;
        sql?: string;
        bindings?: unknown[];
        method?: string;
        requestId?: string;
      }
    >();

    this.connection.on('query', (queryData: any) => {
      const queryId = queryData?.__knexQueryUid;
      if (!queryId) {
        return;
      }

      inflightQueries.set(queryId, {
        startedAt: performance.now(),
        sql: queryData?.sql,
        bindings: Array.isArray(queryData?.bindings) ? queryData.bindings : undefined,
        method: queryData?.method,
        requestId: queryData?.queryContext?.requestId,
      });
    });

    this.connection.on('query-response', (_response: unknown, queryData: any) => {
      const event = this.buildPerformanceEvent({ inflightQueries, queryData, success: true });
      if (event) {
        this.emitPerformance(event);
      }
    });

    this.connection.on('query-error', (error: any, queryData: any) => {
      const event = this.buildPerformanceEvent({
        inflightQueries,
        queryData,
        success: false,
        errorCode: error?.code,
      });

      if (event) {
        this.emitPerformance(event);
      }
    });
  }

  private buildPerformanceEvent({
    inflightQueries,
    queryData,
    success,
    errorCode,
  }: {
    inflightQueries: Map<
      string,
      {
        startedAt: number;
        sql?: string;
        bindings?: unknown[];
        method?: string;
        requestId?: string;
      }
    >;
    queryData: any;
    success: boolean;
    errorCode?: string;
  }): DatabaseQueryPerfEvent | null {
    const queryId = queryData?.__knexQueryUid;
    if (!queryId) {
      return null;
    }

    const state = inflightQueries.get(queryId);
    if (!state) {
      return null;
    }

    inflightQueries.delete(queryId);
    const durationMs = Math.max(0, performance.now() - state.startedAt);
    const isSlowOrFailed = !success || durationMs >= this.performance.slowQueryMs;

    if (!isSlowOrFailed) {
      return null;
    }

    if (Math.random() > this.performance.sampleRate) {
      return null;
    }

    const sql = state.sql;
    const method = state.method;

    const event: DatabaseQueryPerfEvent = {
      type: success ? 'query.slow' : 'query.error',
      timestamp: new Date().toISOString(),
      durationMs,
      dbClient: this.dialect.client,
      queryFingerprint: normalizeSqlFingerprint(sql),
      queryType: toQueryType(method),
      requestId: state.requestId,
      success,
      errorCode,
    };

    if (this.performance.captureSqlText && sql) {
      event.sql = sql;
    }

    if (this.performance.captureBindings && state.bindings) {
      event.bindings = state.bindings;
    }

    return event;
  }

  subscribeToPerformanceEvents(subscriber: DatabasePerformanceSubscriber) {
    this.performanceSubscribers.add(subscriber);

    return () => {
      this.performanceSubscribers.delete(subscriber);
    };
  }

  private emitPerformance(event: DatabaseQueryPerfEvent) {
    for (const subscriber of this.performanceSubscribers) {
      try {
        Promise.resolve(subscriber(event)).catch(() => {
          // Ignore subscriber errors to keep database query path fail-open.
        });
      } catch {
        // Ignore subscriber errors to keep database query path fail-open.
      }
    }
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

  transaction(): Promise<TransactionObject>;
  transaction<TCallback extends Callback>(c: TCallback): Promise<ReturnType<TCallback>>;
  async transaction<TCallback extends Callback>(
    cb?: TCallback
  ): Promise<ReturnType<TCallback> | TransactionObject> {
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

  async destroy() {
    await this.lifecycles.clear();
    await this.connection.destroy();
  }
}

export { Database, errors };
export type { Model, JoinTable, Identifiers, Migration };
export type { DatabaseQueryPerfEvent, DatabasePerformanceConfig, DatabasePerformanceSubscriber };
