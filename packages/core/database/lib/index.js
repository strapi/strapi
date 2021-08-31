'use strict';

const knex = require('knex');

const { getDialect } = require('./dialects');
const createSchemaProvider = require('./schema');
const createMetadata = require('./metadata');
const { createEntityManager } = require('./entity-manager');
const { createLifecyclesManager } = require('./lifecycles');

// TODO: move back into strapi
const { transformContentTypes } = require('./utils/content-types');

class Database {
  constructor(config) {
    this.metadata = createMetadata(config.models);

    // TODO: validate meta
    // this.metadata.validate();

    this.config = config;
    this.dialect = getDialect(this);

    // TODO: migrations -> allow running them through cli before startup
    this.schema = createSchemaProvider(this);

    this.lifecycles = createLifecyclesManager(this);

    this.entityManager = createEntityManager(this);
  }

  async initialize() {
    await this.dialect.initialize();

    this.connection = knex(this.config.connection);

    // register module lifeycles subscriber
    this.lifecycles.subscribe(async event => {
      const { model } = event;
      if (event.action in model.lifecycles) {
        await model.lifecycles[event.action](event);
      }
    });
  }

  query(uid) {
    if (!this.metadata.has(uid)) {
      throw new Error(`Model ${uid} not found`);
    }

    return this.entityManager.getRepository(uid);
  }

  async destroy() {
    await this.lifecycles.clear();
    await this.connection.destroy();
  }
}

// TODO: move into strapi
Database.transformContentTypes = transformContentTypes;
Database.init = async config => {
  const db = new Database(config);

  await db.initialize();

  return db;
};

module.exports = {
  Database,
};
