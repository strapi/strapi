'use strict';

const { has, prop, pick, concat, difference } = require('lodash/fp');
const { PUBLISHED_AT_ATTRIBUTE } = require('strapi-utils').contentTypes.constants;

const { getService } = require('../utils');

module.exports = {
  async find(ctx) {
    const { model, targetField } = ctx.params;
    const { _component, _entityId, _deletedRelations, ...query } = ctx.request.query;

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

    const entityManager = getService('entity-manager');

    if (_entityId) {
      const mainEntity = await entityManager.findOne(_entityId, modelDef.uid, [targetField]);
      if (!mainEntity) {
        return ctx.notFound('_entityId.notFound');
      }
      let existingRelations = Array.isArray(mainEntity[targetField])
        ? mainEntity[targetField].map(prop('id')).map(String)
        : [String(mainEntity[targetField].id)];

      if (_deletedRelations) {
        existingRelations = difference(existingRelations, _deletedRelations.map(String));
      }

      query._where = query._where || {};
      query._where.id_nin = concat(query._where.id_nin || [], existingRelations);
    }

    let entities = [];

    if (has('_q', ctx.request.query)) {
      entities = await entityManager.search(query, target.uid);
    } else {
      entities = await entityManager.find(query, target.uid);
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
