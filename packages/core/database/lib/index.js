'use strict';

const knex = require('knex');

const { getDialect } = require('./dialects');
const createSchemaProvider = require('./schema');
const createMetadata = require('./metadata');
const { createEntityManager } = require('./entity-manager');
const { createMigrationsProvider } = require('./migrations');
const { createLifecyclesProvider } = require('./lifecycles');
const errors = require('./errors');

// TODO: move back into strapi
const { transformContentTypes } = require('./utils/content-types');

class Database {
  constructor(config) {
    this.metadata = createMetadata(config.models);

    this.config = config;

    this.dialect = getDialect(this);
    this.dialect.configure();

    this.connection = knex(this.config.connection);

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
Database.init = async config => new Database(config);

module.exports = {
  Database,
  errors,
};
