import type { Knex } from 'knex';

import { Dialect, getDialect } from './dialects';
import { createSchemaProvider, SchemaProvider } from './schema';
import { createMetadata, Metadata } from './metadata';
import { createEntityManager, EntityManager } from './entity-manager';
import { createMigrationsProvider, MigrationProvider } from './migrations';
import { createLifecyclesProvider, LifecycleProvider } from './lifecycles';
import { createConnection } from './connection';
import * as errors from './errors';
import { Callback, transactionCtx, TransactionObject } from './transaction-context';

// TODO: move back into strapi
import { transformContentTypes } from './utils/content-types';
import { validateDatabase } from './validations';
import { Model } from './types';

export { isKnexQuery } from './utils/knex';

interface Settings {
  forceMigration?: boolean;
  runMigrations?: boolean;
  [key: string]: unknown;
}

export interface DatabaseConfig {
  connection: Knex.Config;
  settings: Settings;
  models: Model[];
}

class Database {
  config: DatabaseConfig;

  metadata: Metadata;

  /**
   * NOTE: The get/set methods are necessary to prevent a breaking change in typescript now that they are not set in the constructor
   */

  #connection?: Knex;

  #dialect?: Dialect;

  #schema?: SchemaProvider;

  #migrations?: MigrationProvider;

  #lifecycles?: LifecycleProvider;

  #entityManager?: EntityManager;

  get connection(): Knex {
    if (!this.#connection) {
      throw new Error('Database.connection is not loaded');
    }
    return this.#connection;
  }

  set connection(value: Knex) {
    this.#connection = value;
  }

  get dialect(): Dialect {
    if (!this.#dialect) {
      throw new Error('Database.dialect is not loaded');
    }
    return this.#dialect;
  }

  set dialect(value: Dialect) {
    this.#dialect = value;
  }

  get schema(): SchemaProvider {
    if (!this.#schema) {
      throw new Error('Database.schema is not loaded');
    }
    return this.#schema;
  }

  set schema(value: SchemaProvider) {
    this.#schema = value;
  }

  get migrations(): MigrationProvider {
    if (!this.#migrations) {
      throw new Error('Database.migrations is not loaded');
    }
    return this.#migrations;
  }

  set migrations(value: MigrationProvider) {
    this.#migrations = value;
  }

  get lifecycles(): LifecycleProvider {
    if (!this.#lifecycles) {
      throw new Error('Database.lifecycles is not loaded');
    }
    return this.#lifecycles;
  }

  set lifecycles(value: LifecycleProvider) {
    this.#lifecycles = value;
  }

  get entityManager(): EntityManager {
    if (!this.#entityManager) {
      throw new Error('Database.entityManager is not loaded');
    }
    return this.#entityManager;
  }

  set entityManager(value: EntityManager) {
    this.#entityManager = value;
  }

  #bootstrapComplete = false;

  static transformContentTypes = transformContentTypes;

  static async init(config: DatabaseConfig) {
    const db = new Database(config);
    await db.bootstrap();
    await validateDatabase(db);
    return db;
  }

  isReady() {
    if (!this.#bootstrapComplete) {
      throw new Error('Database is not ready');
    }
  }

  constructor(config: DatabaseConfig) {
    this.metadata = createMetadata(config.models);

    this.config = {
      ...config,
      settings: {
        forceMigration: true,
        runMigrations: true,
        ...(config.settings ?? {}),
      },
    };
  }

  async bootstrap() {
    this.dialect = getDialect(this);
    this.dialect.configure();

    this.connection = createConnection(this.config.connection);

    await this.dialect.initialize();

    this.schema = createSchemaProvider(this);
    this.migrations = await createMigrationsProvider(this);
    this.lifecycles = createLifecyclesProvider(this);
    this.entityManager = createEntityManager(this);

    this.#bootstrapComplete = true;
  }

  query(uid: string) {
    this.isReady();
    if (!this.metadata.has(uid)) {
      throw new Error(`Model ${uid} not found`);
    }

    return this.entityManager.getRepository(uid);
  }

  inTransaction() {
    this.isReady();
    return !!transactionCtx.get();
  }

  transaction(): Promise<TransactionObject>;
  transaction<TCallback extends Callback>(c: TCallback): Promise<ReturnType<TCallback>>;
  async transaction<TCallback extends Callback>(
    cb?: TCallback
  ): Promise<ReturnType<TCallback> | TransactionObject> {
    this.isReady();
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
    this.isReady();
    return this.connection.client.connectionSettings.schema;
  }

  getConnection(): Knex;
  getConnection(tableName?: string): Knex.QueryBuilder;
  getConnection(tableName?: string): Knex | Knex.QueryBuilder {
    this.isReady();
    const schema = this.getSchemaName();
    const connection = tableName ? this.connection(tableName) : this.connection;
    return schema ? connection.withSchema(schema) : connection;
  }

  getSchemaConnection(trx = this.connection) {
    this.isReady();
    const schema = this.getSchemaName();
    return schema ? trx?.schema.withSchema(schema) : trx?.schema;
  }

  queryBuilder(uid: string) {
    this.isReady();
    return this.entityManager.createQueryBuilder(uid);
  }

  async destroy() {
    this.isReady();
    await this.lifecycles.clear();
    await this.connection.destroy();
  }
}

export { Database, errors };
