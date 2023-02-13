'use strict';

const { assoc, has, prop, omit } = require('lodash/fp');
const strapiUtils = require('@strapi/utils');
const { mapAsync } = require('@strapi/utils');
const { ApplicationError } = require('@strapi/utils').errors;
const { getDeepPopulate, getDeepPopulateDraftCount } = require('./utils/populate');
const { getDeepRelationsCount } = require('./utils/count');
const { sumDraftCounts } = require('./utils/draft');

const { hasDraftAndPublish } = strapiUtils.contentTypes;
const { PUBLISHED_AT_ATTRIBUTE, CREATED_BY_ATTRIBUTE } = strapiUtils.contentTypes.constants;
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

const findCreatorRoles = (entity) => {
  const createdByPath = `${CREATED_BY_ATTRIBUTE}.id`;

  if (has(createdByPath, entity)) {
    const creatorId = prop(createdByPath, entity);
    return strapi.query('admin::role').findMany({ where: { users: { id: creatorId } } });
  }

  return [];
};

const addCreatedByRolesPopulate = (populate) => {
  return {
    ...populate,
    createdBy: {
      populate: ['roles'],
    },
  };
};

/**
 * When webhooks.populateRelations is set to true, populated relations
 * will be passed to any webhook event. The entity-manager
 * response will not have the populated relations though.
 * For performance reasons, it is recommended to set it to false,
 *
 * TODO V5: Set to false by default.
 * TODO V5: Make webhooks always send the same entity data.
 */
const isRelationsPopulateEnabled = () => {
  return strapi.config.get('server.webhooks.populateRelations', true);
};

/**
 * @type {import('./entity-manager').default}
 */
module.exports = ({ strapi }) => ({
  async assocCreatorRoles(entity) {
    if (!entity) {
      return entity;
    }

    const roles = await findCreatorRoles(entity);
    return assoc(`${CREATED_BY_ATTRIBUTE}.roles`, roles, entity);
  },

  /**
   * Extend this function from other plugins to add custom mapping of entity
   * responses
   * @param {Object} entity
   * @returns
   */
  mapEntity(entity) {
    return entity;
  },

  async find(opts, uid) {
    const params = { ...opts, populate: getDeepPopulate(uid) };

    const entities = await strapi.entityService.findMany(uid, params);
    await mapAsync(entities.results, async (entity) => this.mapEntity(entity, uid));
    return entities;
  },

  async findPage(opts, uid) {
    const params = { ...opts, populate: getDeepPopulate(uid, { maxLevel: 1 }) };

    const entities = await strapi.entityService.findPage(uid, params);
    await mapAsync(entities.results, async (entity) => this.mapEntity(entity, uid));
    return entities;
  },

  async findWithRelationCountsPage(opts, uid) {
    const counterPopulate = getDeepPopulate(uid, { countMany: true, maxLevel: 1 });
    const params = { ...opts, populate: addCreatedByRolesPopulate(counterPopulate) };

    const entities = await strapi.entityService.findWithRelationCountsPage(uid, params);
    await mapAsync(entities.results, async (entity) => this.mapEntity(entity, uid));

    return entities;
  },

  async findOneWithCreatorRolesAndCount(id, uid) {
    const counterPopulate = getDeepPopulate(uid, { countMany: true, countOne: true });
    const params = { populate: addCreatedByRolesPopulate(counterPopulate) };

    const entities = await strapi.entityService.findOne(uid, id, params);
    await mapAsync(entities.results, async (entity) => this.mapEntity(entity, uid));

    return entities;
  },

  async findOne(id, uid) {
    const params = { populate: getDeepPopulate(uid) };

    const entity = await strapi.entityService.findOne(uid, id, params);
    return this.mapEntity(entity, uid);
  },

  async findOneWithCreatorRoles(id, uid) {
    const entity = await this.findOne(id, uid);

    if (!entity) {
      return entity;
    }

    return this.assocCreatorRoles(entity);
  },

  async create(body, uid) {
    const modelDef = strapi.getModel(uid);
    const publishData = { ...body };
    const populateRelations = isRelationsPopulateEnabled(uid);

    if (hasDraftAndPublish(modelDef)) {
      publishData[PUBLISHED_AT_ATTRIBUTE] = null;
    }

    const params = {
      data: publishData,
      populate: populateRelations
        ? getDeepPopulate(uid, {})
        : getDeepPopulate(uid, { countMany: true, countOne: true }),
    };

    const entity = await strapi.entityService.create(uid, params);

    // If relations were populated, relations count will be returned instead of the array of relations.
    if (populateRelations) {
      return getDeepRelationsCount(entity, uid);
    }

    return this.mapEntity(entity, uid);
  },

  async update(entity, body, uid) {
    const publishData = omitPublishedAtField(body);
    const populateRelations = isRelationsPopulateEnabled(uid);

    const params = {
      data: publishData,
      populate: populateRelations
        ? getDeepPopulate(uid, {})
        : getDeepPopulate(uid, { countMany: true, countOne: true }),
    };

    const updatedEntity = await strapi.entityService.update(uid, entity.id, params);

    // If relations were populated, relations count will be returned instead of the array of relations.
    if (populateRelations) {
      return getDeepRelationsCount(updatedEntity, uid);
    }

    return this.mapEntity(updatedEntity, uid);
  },

  async delete(entity, uid) {
    const populateRelations = isRelationsPopulateEnabled(uid);

    const params = {
      populate: populateRelations
        ? getDeepPopulate(uid, {})
        : getDeepPopulate(uid, { countMany: true, countOne: true }),
    };

    const deletedEntity = await strapi.entityService.delete(uid, entity.id, params);

    // If relations were populated, relations count will be returned instead of the array of relations.
    if (populateRelations) {
      return getDeepRelationsCount(deletedEntity, uid);
    }

    return deletedEntity;
  },

  // FIXME: handle relations
  deleteMany(opts, uid) {
    const params = { ...opts };

    return strapi.entityService.deleteMany(uid, params);
  },

  async publish(entity, body = {}, uid) {
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
    const populateRelations = isRelationsPopulateEnabled(uid);

    const params = {
      data,
      populate: populateRelations
        ? getDeepPopulate(uid, {})
        : getDeepPopulate(uid, { countMany: true, countOne: true }),
    };

    const updatedEntity = await strapi.entityService.update(uid, entity.id, params);

    await emitEvent(ENTRY_PUBLISH, entity, uid);

    // If relations were populated, relations count will be returned instead of the array of relations.
    if (isRelationsPopulateEnabled(uid)) {
      return getDeepRelationsCount(updatedEntity, uid);
    }

    return this.mapEntity(updatedEntity, uid);
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

    await emitEvent(ENTRY_UNPUBLISH, entity, uid);

    // If relations were populated, relations count will be returned instead of the array of relations.
    if (isRelationsPopulateEnabled(uid)) {
      return getDeepRelationsCount(updatedEntity, uid);
    }

    return this.mapEntity(updatedEntity, uid);
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
