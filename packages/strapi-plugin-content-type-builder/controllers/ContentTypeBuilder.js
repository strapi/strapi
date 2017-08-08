'use strict';

const fs = require('fs');
const _ = require('lodash');

module.exports = {
  models: async ctx => {
    const Service = strapi.plugins['content-type-builder'].services.contenttypebuilder;

    ctx.send({ models: Service.getModels() });
  },

  model: async ctx => {
    const Service = strapi.plugins['content-type-builder'].services.contenttypebuilder;
    const { model } = ctx.params;

    if (!_.get(strapi.models, model)) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.unknow' }] }]);

    ctx.send({ model: Service.getModel(model) });
  },

  create: async ctx => {
    const Service = strapi.plugins['content-type-builder'].services.contenttypebuilder;
    const { name, attributes = [] } = JSON.parse(ctx.request.body);

    if (!name) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.name.missing' }] }]);
    if (strapi.models[name]) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.exist' }] }]);

    strapi.reload.isWatching = false;

    await Service.generateAPI(name, attributes);

    const modelFilePath = Service.getModelPath(name);
    const modelJSON = JSON.parse(fs.readFileSync(modelFilePath), 'utf8');

    modelJSON.attributes = Service.formatAttributes(attributes);

    Service.clearRelations(name);
    Service.createRelations(name, attributes);

    fs.writeFileSync(modelFilePath, JSON.stringify(modelJSON, null, 2), 'utf8');

    ctx.send({ ok: true });

    strapi.reload();
  },

  updateModel: async ctx => {
    const Service = strapi.plugins['content-type-builder'].services.contenttypebuilder;
    const { model } = ctx.params;
    const { name, attributes = [] } = JSON.parse(ctx.request.body);

    if (!_.get(strapi.models, model)) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.unknow' }] }]);

    const modelFilePath = Service.getModelPath(model);
    const modelJSON = JSON.parse(fs.readFileSync(modelFilePath), 'utf8');

    modelJSON.attributes = Service.formatAttributes(attributes);

    Service.clearRelations(model);
    Service.createRelations(model, attributes);

    strapi.reload.isWatching = false;

    fs.writeFileSync(modelFilePath, JSON.stringify(modelJSON, null, 2), 'utf8');

    ctx.send({ ok: true });

    strapi.reload();
  }
};
