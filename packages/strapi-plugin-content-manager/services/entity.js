'use strict';

const { assoc, has, prop, omit } = require('lodash/fp');
const strapiUtils = require('strapi-utils');

const { sanitizeEntity } = strapiUtils;
const { hasDraftAndPublish } = strapiUtils.contentTypes;
const { PUBLISHED_AT_ATTRIBUTE, CREATED_BY_ATTRIBUTE } = strapiUtils.contentTypes.constants;
const { ENTRY_PUBLISH, ENTRY_UNPUBLISH } = strapiUtils.webhook.webhookEvents;

// we omit the published_at so it gets it's default null value and cannot be set via the CM api
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
    return strapi.query('role', 'admin').find({ 'users.id': creatorId }, []);
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

  find(params, model) {
    return strapi.entityService.find({ params }, { model });
  },

  search(params, model) {
    return strapi.entityService.search({ params }, { model });
  },

  count(params, model) {
    return strapi.entityService.count({ params }, { model });
  },

  async findOne(id, model) {
    return strapi.entityService.findOne({ params: { id } }, { model });
  },

  // TODO: should be replace with an option to populate a path in addition to the default populate
  async findOneWithCreatorRoles(id, model) {
    const entity = await this.findOne(id, model);

    if (!entity) {
      return entity;
    }

    return this.assocCreatorRoles(entity);
  },

  async create(body, model) {
    const { data, files } = body;

    const modelDef = strapi.getModel(model);
    const publishData = { ...data };

    if (hasDraftAndPublish(modelDef)) {
      publishData[PUBLISHED_AT_ATTRIBUTE] = null;
    }

    return strapi.entityService.create({ data: publishData, files }, { model });
  },

  update(entity, { data, files }, model) {
    const params = { id: entity.id };
    const publishData = omitPublishedAtField(data);

    return strapi.entityService.update({ params, data: publishData, files }, { model });
  },

  delete(entity, model) {
    const params = { id: entity.id };
    return strapi.entityService.delete({ params }, { model });
  },

  publish: emitEvent(ENTRY_PUBLISH, (entity, model) => {
    const params = { id: entity.id };
    const data = { [PUBLISHED_AT_ATTRIBUTE]: new Date() };

    return strapi.entityService.update({ params, data }, { model });
  }),

  unpublish: emitEvent(ENTRY_UNPUBLISH, (entity, model) => {
    const params = { id: entity.id };
    const data = { [PUBLISHED_AT_ATTRIBUTE]: null };

    return strapi.entityService.update({ params, data }, { model });
  }),
};
