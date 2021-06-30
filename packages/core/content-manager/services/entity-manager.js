'use strict';

const { assoc, has, prop, omit } = require('lodash/fp');
const strapiUtils = require('@strapi/utils');

const { sanitizeEntity } = strapiUtils;
const { hasDraftAndPublish } = strapiUtils.contentTypes;
const { PUBLISHED_AT_ATTRIBUTE, CREATED_BY_ATTRIBUTE } = strapiUtils.contentTypes.constants;
const { ENTRY_PUBLISH, ENTRY_UNPUBLISH } = strapiUtils.webhook.webhookEvents;

const omitPublishedAtField = omit(PUBLISHED_AT_ATTRIBUTE);

const emitEvent = (event, fn) => async (entity, model) => {
  const result = await fn(entity, model);

  const modelDef = strapi.getModel(model);

  strapi.eventHub.emit(event, {
    model: modelDef.modelName,
    entry: sanitizeEntity(result, { model: modelDef }),
  });

  return result;
};

const findCreatorRoles = entity => {
  const createdByPath = `${CREATED_BY_ATTRIBUTE}.id`;

  if (has(createdByPath, entity)) {
    const creatorId = prop(createdByPath, entity);
    return strapi.query('strapi::role').findMany({ where: { users: { id: creatorId } } });
  }

  return [];
};

module.exports = {
  async assocCreatorRoles(entity) {
    if (!entity) {
      return entity;
    }

    const roles = await findCreatorRoles(entity);
    return assoc(`${CREATED_BY_ATTRIBUTE}.roles`, roles, entity);
  },

  find(opts, uid, populate) {
    const params = { ...opts, populate };

    return strapi.entityService.find(uid, { params });
  },

  findPage(opts, uid, populate) {
    const params = { ...opts, populate };

    return strapi.entityService.findPage(uid, { params });
  },

  findWithRelationCounts(opts, uid, populate) {
    const params = { ...opts, populate };

    return strapi.entityService.findWithRelationCounts(uid, { params });
  },

  search(opts, uid, populate) {
    const params = { ...opts, populate };

    return strapi.entityService.search(uid, { params });
  },

  searchPage(opts, uid, populate) {
    const params = { ...opts, populate };

    return strapi.entityService.searchPage(uid, { params });
  },

  searchWithRelationCounts(opts, uid, populate) {
    const params = { ...opts, populate };

    return strapi.entityService.searchWithRelationCounts(uid, { params });
  },

  count(opts, uid) {
    const params = { ...opts };

    return strapi.entityService.count(uid, { params });
  },

  async findOne(id, uid, populate) {
    const params = { filters: { id }, populate };
    return strapi.entityService.findOne(uid, { params });
  },

  async findOneWithCreatorRoles(id, uid, populate) {
    const entity = await this.findOne(id, uid, populate);

    if (!entity) {
      return entity;
    }

    return this.assocCreatorRoles(entity);
  },

  async create(body, uid) {
    const modelDef = strapi.getModel(uid);
    const publishData = { ...body };

    if (hasDraftAndPublish(modelDef)) {
      publishData[PUBLISHED_AT_ATTRIBUTE] = null;
    }

    return strapi.entityService.create(uid, { data: publishData });
  },

  update(entity, body, uid) {
    const params = { id: entity.id };
    const publishData = omitPublishedAtField(body);

    return strapi.entityService.update(uid, { params, data: publishData });
  },

  delete(entity, uid) {
    return strapi.entityService.delete(uid, entity.id);
  },

  findAndDelete(opts, uid) {
    const params = { ...opts };

    return strapi.entityService.delete(uid, { params });
  },

  publish: emitEvent(ENTRY_PUBLISH, async (entity, uid) => {
    if (entity[PUBLISHED_AT_ATTRIBUTE]) {
      throw strapi.errors.badRequest('already.published');
    }

    // validate the entity is valid for publication
    await strapi.entityValidator.validateEntityCreation(strapi.getModel(uid), entity);

    const data = { [PUBLISHED_AT_ATTRIBUTE]: new Date() };

    return strapi.entityService.update(uid, entity.id, { data });
  }),

  unpublish: emitEvent(ENTRY_UNPUBLISH, (entity, uid) => {
    if (!entity[PUBLISHED_AT_ATTRIBUTE]) {
      throw strapi.errors.badRequest('already.draft');
    }

    const data = { [PUBLISHED_AT_ATTRIBUTE]: null };

    return strapi.entityService.update(uid, entity.id, { data });
  }),
};
