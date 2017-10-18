'use strict';

const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const Service = require('../services/ContentTypeBuilder');

module.exports = {
  getModels: async ctx => {
    ctx.send({ models: Service.getModels() });
  },

  getModel: async ctx => {
    const Service = strapi.plugins['content-type-builder'].services.contenttypebuilder;
    let { model } = ctx.params;

    model = _.toLower(model);

    if (!_.get(strapi.models, model)) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.unknow' }] }]);

    ctx.send({ model: Service.getModel(model) });
  },

  getConnections: async ctx => {
    ctx.send({ connections: Service.getConnections() });
  },

  createModel: async ctx => {
    const { name, description, connection, collectionName, attributes = [] } = ctx.request.body;

    if (!name) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.name.missing' }] }]);
    if (!_.includes(Service.getConnections(), connection)) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.connection.unknow' }] }]);
    if (strapi.models[name]) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.exist' }] }]);
    if (!_.isNaN(parseFloat(name[0]))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.name' }] }]);

    const [formatedAttributes, attributesErrors] = Service.formatAttributes(attributes);

    if (!_.isEmpty(attributesErrors)) {
      return ctx.badRequest(null, [{ messages: attributesErrors }]);
    }

    strapi.reload.isWatching = false;

    await Service.generateAPI(name, description, connection, collectionName, []);

    const [modelFilePath, modelFilePathErrors] = Service.getModelPath(name);

    if (!_.isEmpty(modelFilePathErrors)) {
      return ctx.badRequest(null, [{ messages: modelFilePathErrors }]);
    }

    try {
      const modelJSON = require(modelFilePath);

      modelJSON.attributes = formatedAttributes;

      const clearRelationsErrors = Service.clearRelations(name);

      if (!_.isEmpty(clearRelationsErrors)) {
        return ctx.badRequest(null, [{ messages: clearRelationsErrors }]);
      }

      const createRelationsErrors = Service.createRelations(name, attributes);

      if (!_.isEmpty(createRelationsErrors)) {
        return ctx.badRequest(null, [{ messages: createRelationsErrors }]);
      }

      try {
        fs.writeFileSync(modelFilePath, JSON.stringify(modelJSON, null, 2), 'utf8');

        ctx.send({ ok: true });

        strapi.reload();
      } catch (e) {
        return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.write' }] }]);
      }
    } catch (e) {
      return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.read' }] }]);
    }
  },

  updateModel: async ctx => {
    const { model } = ctx.params;
    const { name, description, connection, collectionName, attributes = [] } = ctx.request.body;

    if (!name) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.name.missing' }] }]);
    if (!_.includes(Service.getConnections(), connection)) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.connection.unknow' }] }]);
    if (strapi.models[_.toLower(name)] && name !== model) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.exist' }] }]);
    if (!strapi.models[_.toLower(model)]) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.unknow' }] }]);
    if (!_.isNaN(parseFloat(name[0]))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.name' }] }]);

    const [formatedAttributes, attributesErrors] = Service.formatAttributes(attributes);

    if (!_.isEmpty(attributesErrors)) {
      return ctx.badRequest(null, [{ messages: attributesErrors }]);
    }

    let [modelFilePath, modelFilePathErrors] = Service.getModelPath(model);

    if (!_.isEmpty(modelFilePathErrors)) {
      return ctx.badRequest(null, [{ messages: modelFilePathErrors }]);
    }

    strapi.reload.isWatching = false;

    if (name !== model) {
      await Service.generateAPI(name, description, connection, collectionName, []);
    }

    try {
      const modelJSON = require(modelFilePath);

      modelJSON.attributes = formatedAttributes;
      modelJSON.info = {
        name,
        description
      };
      modelJSON.connection = connection;
      modelJSON.collectionName = collectionName;

      const clearRelationsErrors = Service.clearRelations(model);

      if (!_.isEmpty(clearRelationsErrors)) {
        return ctx.badRequest(null, [{ messages: clearRelationsErrors }]);
      }

      const createRelationsErrors = Service.createRelations(name, attributes);

      if (!_.isEmpty(createRelationsErrors)) {
        return ctx.badRequest(null, [{ messages: createRelationsErrors }]);
      }

      if (name !== model) {
        const removeModelErrors = Service.removeModel(model);

        if (!_.isEmpty(removeModelErrors)) {
          return ctx.badRequest(null, [{ messages: removeModelErrors }]);
        }

        [modelFilePath, modelFilePathErrors] = Service.getModelPath(name);

        if (!_.isEmpty(modelFilePathErrors)) {
          return ctx.badRequest(null, [{ messages: modelFilePathErrors }]);
        }
      }

      try {
        fs.writeFileSync(modelFilePath, JSON.stringify(modelJSON, null, 2), 'utf8');

        ctx.send({ ok: true });

        strapi.reload();
      } catch (e) {
        return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.write' }] }]);
      }
    } catch (e) {
      return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.read' }] }]);
    }
  },

  deleteModel: async ctx => {
    const { model } = ctx.params;

    if (!_.get(strapi.models, model)) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.unknow' }] }]);

    strapi.reload.isWatching = false;

    const clearRelationsErrors = Service.clearRelations(model);

    if (!_.isEmpty(clearRelationsErrors)) {
      return ctx.badRequest(null, [{ messages: clearRelationsErrors }]);
    }

    const removeModelErrors = Service.removeModel(model);

    if (!_.isEmpty(removeModelErrors)) {
      return ctx.badRequest(null, [{ messages: removeModelErrors }]);
    }

    ctx.send({ ok: true });

    strapi.reload();
  },

  autoReload: async ctx => {
    ctx.send({
      autoReload: _.get(strapi.config.environments, 'development.server.autoReload', false),
    });
  }
};
