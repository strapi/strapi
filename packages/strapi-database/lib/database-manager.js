'use strict';

const _ = require('lodash');

const { createQuery } = require('./queries');
const createConnectorRegistry = require('./connector-registry');
const constants = require('./constants');
const { validateModelSchemas } = require('./validation');

class DatabaseManager {
  constructor(strapi) {
    this.strapi = strapi;

    this.initialized = false;

    this.connectors = createConnectorRegistry({
      connections: strapi.config.connections,
      defaultConnection: strapi.config.currentEnvironment.database.defaultConnection,
    });

    this.queries = new Map();
    this.models = new Map();
  }

  async initialize() {
    if (this.initialized === true) {
      throw new Error('Database manager already initialized');
    }

    this.initialized = true;

    this.connectors.load();

    validateModelSchemas({ strapi: this.strapi, manager: this });

    await this.connectors.initialize();

    this.initializeModelsMap();

    return this;
  }

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

  query(entity, plugin) {
    if (!entity) {
      throw new Error(`argument entity is required`);
    }

    const normalizedName = entity.toLowerCase();

    // get by uid or name / plugin
    const model = this.models.has(entity)
      ? this.models.get(entity)
      : this.getModel(normalizedName, plugin);

    if (!model) {
      throw new Error(`The model ${entity} can't be found.`);
    }

    if (this.queries.has(model.uid)) {
      return this.queries.get(model.uid);
    }

    const connectorQuery = this.connectors
      .get(model.orm)
      .queries({ model, modelKey: model.modelName, strapi });

    const query = createQuery({
      connectorQuery,
      model,
    });

    this.queries.set(model.uid, query);
    return query;
  }

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

  getModelByCollectionName(collectionName) {
    return Array.from(this.models.values()).find(model => {
      return model.collectionName === collectionName;
    });
  }

  getModelByGlobalId(globalId) {
    return Array.from(this.models.values()).find(model => {
      return model.globalId === globalId;
    });
  }

  getReservedNames() {
    return {
      models: constants.RESERVED_MODEL_NAMES,
      attributes: [
        ...constants.RESERVED_ATTRIBUTE_NAMES,
        ...(strapi.db.connectors.default.defaultTimestamps || []),
      ],
    };
  }
}

function createDatabaseManager(strapi) {
  return new DatabaseManager(strapi);
}

module.exports = {
  createDatabaseManager,
};
