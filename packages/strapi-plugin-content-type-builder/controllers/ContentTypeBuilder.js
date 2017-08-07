'use strict';

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

    Service.generateAPI(name, attributes);

    ctx.send({ ok: true });
  },

  updateModel: async ctx => {
    const Service = strapi.plugins['content-type-builder'].services.contenttypebuilder;
    const { model } = ctx.params;
    const { name, attributes = [] } = JSON.parse(ctx.request.body);

    if (!_.get(strapi.models, model)) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.unknow' }] }]);

    const modelFilePath = Service.getModelPath(model);
    const modelJSON = Service.readModel(modelFilePath);

    if (!_.isEmpty(attributes)) {
      modelJSON.attributes = {};

      _.forEach(attributes, attribute => {
        modelJSON.attributes[attribute.name] = _.get(attribute, 'params', {});
      });
    }

    Service.rewriteModel(modelFilePath, modelJSON);

    ctx.send({ ok: true });
  }
};
