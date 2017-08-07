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

    ctx.send({ model: Service.getModel(model) });
  },

  create: async ctx => {
    const Service = strapi.plugins['content-type-builder'].services.contenttypebuilder;
    const { name, attributes = [] } = ctx.request.body;

    if (!name) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.name.missing' }] }]);
    if (strapi.models[name]) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.exist' }] }]);

    Service.generateAPI(name, attributes);

    ctx.send({ ok: true });
  }
};
