'use strict';

const { getDialect } = require('./dialects');
const createSchemaProvider = require('./schema');
const createMetadata = require('./metadata');
const { createEntityManager } = require('./entity-manager');
const { createMigrationsProvider } = require('./migrations');
const { createLifecyclesProvider } = require('./lifecycles');
const createConnection = require('./connection');
const errors = require('./errors');

// TODO: move back into strapi
const { transformContentTypes } = require('./utils/content-types');

class Database {
  constructor(config) {
    this.metadata = createMetadata(config.models);

    this.config = {
      connection: {},
      settings: {
        forceMigration: true,
      },
      ...config,
    };

    this.dialect = getDialect(this);
    this.dialect.configure();

    this.connection = createConnection(this.config.connection);

    this.dialect.initialize();

    this.schema = createSchemaProvider(this);

    this.migrations = createMigrationsProvider(this);
    this.lifecycles = createLifecyclesProvider(this);

    this.entityManager = createEntityManager(this);
  }

  query(uid) {
    if (!this.metadata.has(uid)) {
      throw new Error(`Model ${uid} not found`);
    }

    return this.entityManager.getRepository(uid);
  }

  async transaction(cb) {
    if (!cb) {
      return this.connection.transaction();
    }

    return this.connection.transaction(async (trx) => {
      const em = createEntityManager(this, trx);
      await cb(em);
    });
  }

  getConnection(tableName, trx) {
    const schema = this.connection.getSchemaName();
    const connOrTrx = trx || this.connection;
    const connection = tableName ? connOrTrx(tableName) : connOrTrx;
    return schema ? connection.withSchema(schema) : connection;
  }

  getSchemaConnection(trx = this.connection) {
    const schema = this.connection.getSchemaName();
    return schema ? trx.schema.withSchema(schema) : trx.schema;
  }

  queryBuilder(uid) {
    return this.entityManager.createQueryBuilder(uid);
  }

  async destroy() {
    await this.lifecycles.clear();
    await this.connection.destroy();
  }
}

// TODO: move into strapi
Database.transformContentTypes = transformContentTypes;
Database.init = async (config) => new Database(config);

module.exports = {
  Database,
  errors,
};
