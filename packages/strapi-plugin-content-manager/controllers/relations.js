'use strict';

const { has, prop, pick } = require('lodash/fp');
const { PUBLISHED_AT_ATTRIBUTE } = require('strapi-utils').contentTypes.constants;

const { getService } = require('../utils');

module.exports = {
  async find(ctx) {
    const { model, targetField } = ctx.params;
    const { _component, ...query } = ctx.request.query;

    if (!targetField) {
      return ctx.badRequest();
    }

    const modelDef = _component ? strapi.db.getModel(_component) : strapi.db.getModel(model);

    if (!modelDef) {
      return ctx.notFound('model.notFound');
    }

    const attr = modelDef.attributes[targetField];
    if (!attr) {
      return ctx.badRequest('targetField.invalid');
    }

    const target = strapi.db.getModelByAssoc(attr);

    if (!target) {
      return ctx.notFound('target.notFound');
    }

    const contentManagerService = getService('contentmanager');

    let entities = [];

    if (has('_q', ctx.request.query)) {
      entities = await contentManagerService.search(target.uid, query);
    } else {
      entities = await contentManagerService.fetchAll(target.uid, query);
    }

    if (!entities) {
      return ctx.notFound();
    }

    const modelConfig = _component
      ? await getService('components').findConfiguration(modelDef)
      : await getService('content-types').findConfiguration(modelDef);

    const field = prop(`metadatas.${targetField}.edit.mainField`, modelConfig) || 'id';
    const pickFields = [field, 'id', target.primaryKey, PUBLISHED_AT_ATTRIBUTE];

    ctx.body = entities.map(pick(pickFields));
  },
};
