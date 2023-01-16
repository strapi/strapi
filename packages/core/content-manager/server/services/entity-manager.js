'use strict';

const { assoc, has, prop, omit } = require('lodash/fp');
const strapiUtils = require('@strapi/utils');
const { ApplicationError } = require('@strapi/utils').errors;
const { getDeepPopulate, getDeepPopulateDraftCount } = require('./utils/populate');
const { getDeepRelationsCount } = require('./utils/count');
const { sumDraftCounts } = require('./utils/draft');

const { hasDraftAndPublish } = strapiUtils.contentTypes;
const { PUBLISHED_AT_ATTRIBUTE, CREATED_BY_ATTRIBUTE } = strapiUtils.contentTypes.constants;
const { ENTRY_PUBLISH, ENTRY_UNPUBLISH } = strapiUtils.webhook.webhookEvents;

const omitPublishedAtField = omit(PUBLISHED_AT_ATTRIBUTE);

const wrapWithEmitEvent = (event, fn) => async (entity, body, model) => {
  const result = await fn(entity, body, model);

  const modelDef = strapi.getModel(model);
  const sanitizedEntity = await strapiUtils.sanitize.sanitizers.defaultSanitizeOutput(
    modelDef,
    entity
  );

  strapi.eventHub.emit(event, {
    model: modelDef.modelName,
    entry: sanitizedEntity,
  });

  if (isRelationsPopulateEnabled(model)) {
    return getDeepRelationsCount(entity, model);
  }

  return result;
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
 * When relations.populate is set to true, populated relations
 * will be passed to the webhook and db lifecycles events. The entity-manager
 * response will not have the populated relations though.
 * For performance reasons, it is recommended to set it to false,
 */
const isRelationsPopulateEnabled = () => {
  return strapi.config.get('server.relations.populate', true);
};

const getCountDeepPopulate = (uid) => getDeepPopulate(uid, { countMany: true, countOne: true });

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

  find(opts, uid) {
    const params = { ...opts, populate: getDeepPopulate(uid) };

    return strapi.entityService.findMany(uid, params);
  },

  findPage(opts, uid) {
    const params = { ...opts, populate: getDeepPopulate(uid, { maxLevel: 1 }) };

    return strapi.entityService.findPage(uid, params);
  },

  findWithRelationCountsPage(opts, uid) {
    const counterPopulate = getDeepPopulate(uid, { countMany: true, maxLevel: 1 });
    const params = { ...opts, populate: addCreatedByRolesPopulate(counterPopulate) };

    return strapi.entityService.findWithRelationCountsPage(uid, params);
  },

  findOneWithCreatorRolesAndCount(id, uid) {
    const counterPopulate = getDeepPopulate(uid, { countMany: true, countOne: true });
    const params = { populate: addCreatedByRolesPopulate(counterPopulate) };

    return strapi.entityService.findOne(uid, id, params);
  },

  async findOne(id, uid) {
    const params = { populate: getDeepPopulate(uid) };

    return strapi.entityService.findOne(uid, id, params);
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
      populate: populateRelations ? getDeepPopulate(uid, {}) : getCountDeepPopulate(uid),
    };

    const entity = await strapi.entityService.create(uid, params);

    // If relations were populated, load the entity again without populating them,
    // to avoid performance issues
    if (populateRelations) {
      return getDeepRelationsCount(entity, uid);
    }

    return entity;
  },

  async update(entity, body, uid) {
    const publishData = omitPublishedAtField(body);
    const populateRelations = isRelationsPopulateEnabled(uid);

    const params = {
      data: publishData,
      populate: populateRelations ? getDeepPopulate(uid, {}) : getCountDeepPopulate(uid),
    };

    const updatedEntity = await strapi.entityService.update(uid, entity.id, params);

    if (populateRelations) {
      return getDeepRelationsCount(updatedEntity, uid);
    }

    return updatedEntity;
  },

  async delete(entity, uid) {
    const populateRelations = isRelationsPopulateEnabled(uid);

    const params = {
      populate: populateRelations ? getDeepPopulate(uid, {}) : getCountDeepPopulate(uid),
    };

    const deletedEntity = await strapi.entityService.delete(uid, entity.id, params);

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

  publish: wrapWithEmitEvent(ENTRY_PUBLISH, async (entity, body = {}, uid) => {
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
      populate: populateRelations ? getDeepPopulate(uid, {}) : getCountDeepPopulate(uid),
    };

    return strapi.entityService.update(uid, entity.id, params);
  }),

  unpublish: wrapWithEmitEvent(ENTRY_UNPUBLISH, async (entity, body = {}, uid) => {
    if (!entity[PUBLISHED_AT_ATTRIBUTE]) {
      throw new ApplicationError('already.draft');
    }

    const data = { ...body, [PUBLISHED_AT_ATTRIBUTE]: null };
    const populateRelations = isRelationsPopulateEnabled(uid);

    const params = {
      data,
      populate: populateRelations ? getDeepPopulate(uid, {}) : getCountDeepPopulate(uid),
    };

    return strapi.entityService.update(uid, entity.id, params);
  }),

  async getNumberOfDraftRelations(id, uid) {
    const { populate, hasRelations } = getDeepPopulateDraftCount(uid);

    if (!hasRelations) {
      return 0;
    }

    const entity = await strapi.entityService.findOne(uid, id, { populate });

    return sumDraftCounts(entity, uid);
  },
});
