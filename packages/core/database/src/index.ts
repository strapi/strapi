import type { Knex } from 'knex';

import createDebugger from 'debug';
import { Dialect, getDialect } from './dialects';
import { createSchemaProvider, SchemaProvider } from './schema';
import { createMetadata, Metadata } from './metadata';
import { createEntityManager, EntityManager } from './entity-manager';
import { createMigrationsProvider, MigrationProvider } from './migrations';
import { createLifecyclesProvider, LifecycleProvider } from './lifecycles';
import { createConnection } from './connection';
import * as errors from './errors';
import { Callback, transactionCtx, TransactionObject } from './transaction-context';
import { validateDatabase } from './validations';
import type { Model } from './types';
import type { Migration } from './migrations';
import { type Identifiers } from './utils/identifiers';

export { isKnexQuery } from './utils/knex';

const debug = createDebugger('strapi::database');

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
  #connection?: Knex;

  dialect: Dialect;

  config: DatabaseConfig;

  metadata: Metadata;

  schema: SchemaProvider;

  migrations: MigrationProvider;

  lifecycles: LifecycleProvider;

  entityManager: EntityManager;

  logger: Logger;

  constructor(config: DatabaseConfig) {
    this.config = {
      ...config,
      settings: {
        forceMigration: true,
        runMigrations: true,
        ...(config.settings ?? {}),
      },
    };

    this.dialect = getDialect(this);
    this.dialect.configure();

    this.metadata = createMetadata([]);

    // for object connections, create Knex connection synchronously
    if (typeof this.config.connection.connection !== 'function') {
      debug('Creating knex connection');
      this.#connection = this.#createConnection(this.config.connection);
    }

    this.schema = createSchemaProvider(this);

    this.migrations = createMigrationsProvider(this);
    this.lifecycles = createLifecyclesProvider(this);

    this.entityManager = createEntityManager(this);

    this.logger = config.logger ?? console;
  }

  #createConnection(connection: Knex.Config) {
    return createConnection(connection, {
      pool: { afterCreate: afterCreate(this) },
    });
  }

  async init({ models }: { models: Model[] }) {
    // for function connections, create Knex connection asynchronously
    // this is necessary to fully support Knex async functions, allowing for async authorization methods
    if (typeof this.config.connection.connection === 'function') {
      debug('Creating knex connection from function');
      const conn = {
        ...this.config.connection,
        // We await the function so it resolves to an object config
        // That way we don't have to resolve it every time the connection getter is called
        // In the future we could make a breaking change to disallow accessing connection
        // directly and pass it directly to Knex as a function
        // Note that this means we do not support Knex `expirationChecker` because
        // we would have to implement it ourselves
        connection: await this.config.connection.connection(),
      };
      this.#connection = this.#createConnection(conn);
    }

    this.metadata.loadModels(models);
    await validateDatabase(this);

    debug('Database initialized');

    return this;
  }

  get connection() {
    if (this.#connection === undefined) {
      throw new Error('Database connection has not yet been initialized');
    }

    return this.#connection;
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
export type { Model, Identifiers, Migration };
