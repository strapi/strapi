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
    const { model } = ctx.params;

    if (!_.get(strapi.models, model)) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.unknow' }] }]);

    ctx.send({ model: Service.getModel(model) });
  },

  getConnections: async ctx => {
    ctx.send({ connections: Service.getConnections() });
  },

  createModel: async ctx => {
    const { name, connection, attributes = [] } = JSON.parse(ctx.request.body);

    if (!name) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.name.missing' }] }]);
    if (strapi.models[name]) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.exist' }] }]);

    strapi.reload.isWatching = false;

    await Service.generateAPI(name, connection, attributes);

    const [modelFilePath, modelFilePathErrors] = Service.getModelPath(name);

    if (!_.isEmpty(modelFilePathErrors)) {
      return ctx.badRequest(null, [{ messages: modelFilePathErrors }]);
    }

    try {
      console.log(modelFilePath);
      const modelJSON = require(modelFilePath);

      modelJSON.attributes = Service.formatAttributes(attributes);

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
    const { name, attributes = [] } = ctx.request.body;

    if (!_.get(strapi.models, model)) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.unknow' }] }]);

    const [modelFilePath, modelFilePathErrors] = Service.getModelPath(model);

    if (!_.isEmpty(modelFilePathErrors)) {
      return ctx.badRequest(null, [{ messages: modelFilePathErrors }]);
    }

    try {
      const modelJSON = JSON.parse(require(modelFilePath));

      modelJSON.attributes = Service.formatAttributes(attributes);

      strapi.reload.isWatching = false;

      const clearRelationsErrors = Service.clearRelations(model);

      if (!_.isEmpty(clearRelationsErrors)) {
        return ctx.badRequest(null, [{ messages: clearRelationsErrors }]);
      }

      const createRelationsErrors = Service.createRelations(model, attributes);

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
  }
};
