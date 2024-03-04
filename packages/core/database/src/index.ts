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
import { validateDatabase } from './validations';
import type { MetadataOptions, Model } from './types';
import * as identifiers from './utils/identifiers';

export { isKnexQuery } from './utils/knex';

// The max length for a database identifier
export const MAX_DB_IDENTIFIER_LENGTH = 55;

interface Settings {
  forceMigration?: boolean;
  runMigrations?: boolean;
  maxIdentifierLength?: number;
  [key: string]: unknown;
}

export interface DatabaseConfig {
  connection: Knex.Config;
  settings: Settings;
  models: Model[];
}

class Database {
  connection: Knex;

  dialect: Dialect;

  config: DatabaseConfig;

  metadata: Metadata;

  schema: SchemaProvider;

  migrations: MigrationProvider;

  lifecycles: LifecycleProvider;

  entityManager: EntityManager;

  #metadataOptions: MetadataOptions;

  static async init(config: DatabaseConfig) {
    const db = new Database(config);
    await validateDatabase(db, db.#metadataOptions);
    return db;
  }

  constructor(config: DatabaseConfig) {
    // TODO: do we want this to be user-configurable? Probably not
    this.#metadataOptions = {
      maxLength: config?.settings?.maxIdentifierLength ?? MAX_DB_IDENTIFIER_LENGTH,
    };

    this.metadata = createMetadata(config.models, this.#metadataOptions);

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

    const afterCreate = (
      nativeConnection: unknown,
      done: (error: Error | null, nativeConnection: unknown) => Promise<void>
    ) => {
      // run initialize for it since commands such as postgres SET and sqlite PRAGMA are per-connection
      this.dialect.initialize(nativeConnection).then(() => {
        return done(null, nativeConnection);
      });
    };

    this.connection = createConnection(this.config.connection, { pool: { afterCreate } });

    this.schema = createSchemaProvider(this, this.#metadataOptions);

    this.migrations = createMigrationsProvider(this);
    this.lifecycles = createLifecyclesProvider(this);

    this.entityManager = createEntityManager(this);
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

const utils = { identifiers };
const constants = { MAX_DB_IDENTIFIER_LENGTH };

export { Database, errors, utils, constants };
export type { Model, MetadataOptions };
