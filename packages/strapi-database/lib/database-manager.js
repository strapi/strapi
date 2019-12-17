'use strict';

const _ = require('lodash');

const requireConnector = require('./require-connector');
const { createQuery } = require('./queries');

class DatabaseManager {
  constructor(strapi) {
    this.strapi = strapi;

    this.initialized = false;

    this.queries = new Map();
    this.connectors = new Map();
    this.models = new Map();
  }

  async initialize() {
    if (this.initialized === true) {
      throw new Error('Database manager already initialized');
    }

    this.initialized = true;

    const connectorsToInitialize = [];
    for (const connection of Object.values(this.strapi.config.connections)) {
      const { connector } = connection;
      if (!connectorsToInitialize.includes(connector)) {
        connectorsToInitialize.push(connector);
      }
    }

    for (const connectorToInitialize of connectorsToInitialize) {
      const connector = requireConnector(connectorToInitialize)(strapi);

      this.connectors.set(connectorToInitialize, connector);

      await connector.initialize();
    }

    this.initializeModelsMap();

    return this;
  }

  /**
   * Creates a map with every model
   */
  initializeModelsMap() {
    Object.keys(this.strapi.models).forEach(modelKey => {
      const model = this.strapi.models[modelKey];
      this.models.set(model.uid, model);
    });

    Object.keys(this.strapi.admin.models).forEach(modelKey => {
      const model = this.strapi.admin.models[modelKey];
      this.models.set(model.uid, model);
    });

    Object.keys(this.strapi.plugins).forEach(pluginKey => {
      Object.keys(this.strapi.plugins[pluginKey].models).forEach(modelKey => {
        const model = this.strapi.plugins[pluginKey].models[modelKey];
        this.models.set(model.uid, model);
      });
    });
  }

  /**
   * Return a model queries by uid or (name, plugin)
   */
  query(name, plugin) {
    if (!name) {
      throw new Error(
        `strapi.query must be called with the entity name and plugin strapi.query(name, plugin)`
      );
    }

    const key = _.toLower(name);

    // get by uid or name / plugin
    const model = this.models.has(key)
      ? this.models.get(key)
      : this.getModel(key, plugin);

    if (!model) {
      throw new Error(`The model ${name} can't be found.`);
    }

    if (this.queries.has(model.uid)) {
      return this.queries.get(model.uid);
    }

    const connectorQuery = this.connectors
      .get(model.orm)
      .queries({ model, strapi });

    const query = createQuery({ connectorQuery, model });
    this.queries.set(model.uid, query);
    return query;
  }

  /**
   * Return a model by uid or (name, plugin)
   */
  getModel(name, plugin) {
    const key = _.toLower(name);

    if (this.models.has(key)) return this.models.get(key);

    if (plugin === 'admin') {
      return _.get(strapi.admin, ['models', key]);
    }

    return (
      _.get(strapi.plugins, [plugin, 'models', key]) ||
      _.get(strapi, ['models', key]) ||
      _.get(strapi, ['components', key])
    );
  }

  /**
   * Returns a model by its collectionName
   * @param {*} collectionName
   */
  getModelByCollectionName(collectionName) {
    return Array.from(this.models.values()).find(model => {
      return model.collectionName === collectionName;
    });
  }
}

function createDatabaseManager(strapi) {
  return new DatabaseManager(strapi);
}

module.exports = {
  createDatabaseManager,
};
