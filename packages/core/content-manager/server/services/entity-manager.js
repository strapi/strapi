'use strict';

const { omit } = require('lodash/fp');
const strapiUtils = require('@strapi/utils');
const { mapAsync } = require('@strapi/utils');
const { ApplicationError } = require('@strapi/utils').errors;
const { getDeepPopulate, getDeepPopulateDraftCount } = require('./utils/populate');
const { getDeepRelationsCount } = require('./utils/count');
const { sumDraftCounts } = require('./utils/draft');
const { isRelationsPopulateEnabled } = require('./utils/populate');

const { hasDraftAndPublish } = strapiUtils.contentTypes;
const { PUBLISHED_AT_ATTRIBUTE } = strapiUtils.contentTypes.constants;
const { ENTRY_PUBLISH, ENTRY_UNPUBLISH } = strapiUtils.webhook.webhookEvents;

const omitPublishedAtField = omit(PUBLISHED_AT_ATTRIBUTE);

const emitEvent = async (event, entity, modelUid) => {
  const modelDef = strapi.getModel(modelUid);
  const sanitizedEntity = await strapiUtils.sanitize.sanitizers.defaultSanitizeOutput(
    modelDef,
    entity
  );

  strapi.eventHub.emit(event, {
    model: modelDef.modelName,
    entry: sanitizedEntity,
  });
};

/**
 * @type {import('./entity-manager').default}
 */
module.exports = ({ strapi }) => ({
  /**
   * Extend this function from other plugins to add custom mapping of entity
   * responses
   * @param {Object} entity
   * @returns
   */
  mapEntity(entity) {
    return entity;
  },

  /**
   * Some entity manager functions may return multiple entities or one entity.
   * This function maps the response in both cases
   * @param {Array|Object|null} entities
   * @param {string} uid
   */
  async mapEntitiesResponse(entities, uid) {
    if (entities?.results) {
      const mappedResults = await mapAsync(entities.results, (entity) =>
        this.mapEntity(entity, uid)
      );
      return { ...entities, results: mappedResults };
    }
    // if entity is single type
    return this.mapEntity(entities, uid);
  },

  async find(opts, uid) {
    const params = { ...opts, populate: getDeepPopulate(uid) };
    const entities = await strapi.entityService.findMany(uid, params);
    return this.mapEntitiesResponse(entities, uid);
  },

  async findPage(opts, uid) {
    const entities = await strapi.entityService.findPage(uid, opts);
    return this.mapEntitiesResponse(entities, uid);
  },

  async findOne(id, uid, opts = {}) {
    return strapi.entityService
      .findOne(uid, id, opts)
      .then((entity) => this.mapEntity(entity, uid));
  },

  async create(body, uid, opts = {}) {
    const modelDef = strapi.getModel(uid);
    const publishData = { ...body };

    if (hasDraftAndPublish(modelDef)) {
      publishData[PUBLISHED_AT_ATTRIBUTE] = null;
    }

    const params = { data: publishData, ...opts };

    const entity = await strapi.entityService
      .create(uid, params)
      .then((entity) => this.mapEntity(entity, uid));

    // If relations were populated, relations count will be returned instead of the array of relations.
    if (isRelationsPopulateEnabled(uid)) {
      return getDeepRelationsCount(entity, uid);
    }

    return entity;
  },

  async update(entity, body, uid, opts = {}) {
    const publishData = omitPublishedAtField(body);

    const params = { data: publishData, ...opts };

    const updatedEntity = await strapi.entityService
      .update(uid, entity.id, params)
      .then((entity) => this.mapEntity(entity, uid));

    // If relations were populated, relations count will be returned instead of the array of relations.
    if (isRelationsPopulateEnabled(uid)) {
      return getDeepRelationsCount(updatedEntity, uid);
    }

    return updatedEntity;
  },

  async delete(entity, uid, opts = {}) {
    const deletedEntity = await strapi.entityService.delete(uid, entity.id, opts);

    // If relations were populated, relations count will be returned instead of the array of relations.
    if (isRelationsPopulateEnabled(uid)) {
      return getDeepRelationsCount(deletedEntity, uid);
    }

    return deletedEntity;
  },

  // FIXME: handle relations
  deleteMany(opts, uid) {
    return strapi.entityService.deleteMany(uid, opts);
  },

  async publish(entity, body = {}, uid, opts = {}) {
    if (entity[PUBLISHED_AT_ATTRIBUTE]) {
      throw new ApplicationError('already.published');
    }

    // validate the entity is valid for publication
    await strapi.entityValidator.validateEntityCreation(
      strapi.getModel(uid),
      entity,
      undefined,
      entity
    );

    const data = { ...body, [PUBLISHED_AT_ATTRIBUTE]: new Date() };

    const params = { data, ...opts };

    const updatedEntity = await strapi.entityService.update(uid, entity.id, params);

    await emitEvent(ENTRY_PUBLISH, updatedEntity, uid);

    const mappedEntity = await this.mapEntity(updatedEntity, uid);

    // If relations were populated, relations count will be returned instead of the array of relations.
    if (isRelationsPopulateEnabled(uid)) {
      return getDeepRelationsCount(mappedEntity, uid);
    }

    return mappedEntity;
  },

  async unpublish(entity, body = {}, uid) {
    if (!entity[PUBLISHED_AT_ATTRIBUTE]) {
      throw new ApplicationError('already.draft');
    }

    const data = { ...body, [PUBLISHED_AT_ATTRIBUTE]: null };
    const populateRelations = isRelationsPopulateEnabled(uid);

    const params = {
      data,
      populate: populateRelations
        ? getDeepPopulate(uid, {})
        : getDeepPopulate(uid, { countMany: true, countOne: true }),
    };

    const updatedEntity = await strapi.entityService.update(uid, entity.id, params);

    await emitEvent(ENTRY_UNPUBLISH, updatedEntity, uid);

    const mappedEntity = await this.mapEntity(updatedEntity, uid);

    // If relations were populated, relations count will be returned instead of the array of relations.
    if (isRelationsPopulateEnabled(uid)) {
      return getDeepRelationsCount(mappedEntity, uid);
    }

    return mappedEntity;
  },

  async getNumberOfDraftRelations(id, uid) {
    const { populate, hasRelations } = getDeepPopulateDraftCount(uid);

    if (!hasRelations) {
      return 0;
    }

    const entity = await strapi.entityService.findOne(uid, id, { populate });

    return sumDraftCounts(entity, uid);
  },
});
