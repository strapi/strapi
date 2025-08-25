import type { Knex } from 'knex';

import path from 'node:path';
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
import type { Model } from './types';
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

  /**
   * Find the parent entry of a component instance.
   *
   * Given a component model, a specific component instance id, and the list of
   * possible parent content types (those that can embed this component),
   * this function checks each parent's *_cmps join table to see if the component
   * instance is linked to a parent entity.
   *
   * - Returns the parent uid, parent table name, and parent id if found.
   * - Returns null if no parent relationship exists.
   *
   * * */
  async findComponentParent(
    component: any,
    componentId: number | string,
    componentParents: any[],
    opts?: { trx?: Knex.Transaction } // optional transaction to run queries under
  ): Promise<{ uid?: string; table: string; parentId: number | string } | null> {
    // Defensive: if the component model has no uid, we can't match against component_type
    if (!component?.uid) return null;

    // Helper: schemaBuilder aware of both schema and trx
    const schemaBuilder = this.getSchemaConnection(opts?.trx);

    // Helper: attach trx to any query builder if trx is provided
    const withTrx = <T extends Knex.QueryBuilder>(qb: T) =>
      opts?.trx ? qb.transacting(opts.trx) : qb;

    // Iterate over every candidate parent CT that can embed this component
    for (const parent of componentParents) {
      const cmpsTable = `${parent.collectionName}_cmps`; // convention: <collection>_cmps

      try {
        // Check that the join table actually exists (important across dialects / test fixtures)
        const exists = await schemaBuilder.hasTable(cmpsTable);
        if (!exists) continue;

        // Query the join table for a row linking this componentId + type to a parent entity
        const row = await withTrx(this.getConnection(cmpsTable))
          .where({
            cmp_id: componentId,
            component_type: component.uid,
          })
          .first<{ entity_id: number | string }>('entity_id');

        // If found, return the parent content type uid + table + parent id
        if (row) {
          return {
            uid: parent.uid, // e.g. 'api::article.article'
            table: parent.collectionName, // e.g. 'articles'
            parentId: row.entity_id, // the parent entry id
          };
        }
      } catch {
        // Gracefully handle invalid table names / schema issues and move to next parent
        continue;
      }
    }

    // If no parent found across all candidates, return null
    return null;
  }
}

export { Database, errors };
export type { Model, Identifiers, Migration };
