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

  createModel: async ctx => {
    const { name, attributes = [] } = ctx.request.body;

    if (!name) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.name.missing' }] }]);
    if (strapi.models[name]) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.exist' }] }]);

    strapi.reload.isWatching = false;

    await Service.generateAPI(name, attributes);

    const [modelFilePath, modelFilePathErrors] = Service.getModelPath(name);

    if (modelFilePathErrors) {
      return ctx.badRequest(null, [{ messages: modelFilePathErrors }]);
    }

    let modelJSON;
    try {
      modelJSON = JSON.parse(require(modelFilePath));
    } catch (e) {
      return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.read' }] }]);
    }

    modelJSON.attributes = Service.formatAttributes(attributes);

    const clearRelationsErrors = Service.clearRelations(name);

    if (clearRelationsErrors) {
      return ctx.badRequest(null, [{ messages: clearRelationsErrors }]);
    }

    const createRelationsErrors = Service.createRelations(name, attributes);

    if (createRelationsErrors) {
      return ctx.badRequest(null, [{ messages: createRelationsErrors }]);
    }

    try {
      fs.writeFileSync(modelFilePath, JSON.stringify(modelJSON, null, 2), 'utf8');
    } catch (e) {
      return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.write' }] }]);
    }

    ctx.send({ ok: true });

    strapi.reload();
  },

  updateModel: async ctx => {
    const { model } = ctx.params;
    const { name, attributes = [] } = ctx.request.body;

    if (!_.get(strapi.models, model)) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.unknow' }] }]);

    const [modelFilePath, modelFilePathErrors] = Service.getModelPath(model);

    if (modelFilePathErrors) {
      return ctx.badRequest(null, [{ messages: modelFilePathErrors }]);
    }

    let modelJSON;
    try {
      modelJSON = JSON.parse(require(modelFilePath));
    } catch (e) {
      return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.read' }] }]);
    }

    modelJSON.attributes = Service.formatAttributes(attributes);

    strapi.reload.isWatching = false;

    const clearRelationsErrors = Service.clearRelations(model);

    if (clearRelationsErrors) {
      return ctx.badRequest(null, [{ messages: clearRelationsErrors }]);
    }

    const createRelationsErrors = Service.createRelations(model, attributes);

    if (createRelationsErrors) {
      return ctx.badRequest(null, [{ messages: createRelationsErrors }]);
    }

    try {
      fs.writeFileSync(modelFilePath, JSON.stringify(modelJSON, null, 2), 'utf8');
    } catch (e) {
      return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.write' }] }]);
    }

    ctx.send({ ok: true });

    strapi.reload();
  },

  deleteModel: async ctx => {
    const { model } = ctx.params;

    if (!_.get(strapi.models, model)) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.unknow' }] }]);

    strapi.reload.isWatching = false;

    const clearRelationsErrors = Service.clearRelations(model);

    if (clearRelationsErrors) {
      return ctx.badRequest(null, [{ messages: clearRelationsErrors }]);
    }

    const removeModelErrors = Service.removeModel(model);

    if (removeModelErrors) {
      return ctx.badRequest(null, [{ messages: removeModelErrors }]);
    }

    ctx.send({ ok: true });

    strapi.reload();
  }
};
