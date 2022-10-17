'use strict';

const { assoc, has, prop, omit } = require('lodash/fp');
const strapiUtils = require('@strapi/utils');
const { ApplicationError } = require('@strapi/utils').errors;
const { getDeepPopulate, getDeepPopulateDraftCount } = require('./utils/populate');
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

  find(opts, uid, populate) {
    const params = { ...opts, populate: getDeepPopulate(uid, populate) };

    return strapi.entityService.findMany(uid, params);
  },

  findPage(opts, uid, populate) {
    const params = { ...opts, populate: getDeepPopulate(uid, populate, { maxLevel: 1 }) };

    return strapi.entityService.findPage(uid, params);
  },

  findWithRelationCountsPage(opts, uid, populate) {
    const counterPopulate = getDeepPopulate(uid, populate, { countMany: true, maxLevel: 1 });
    const params = { ...opts, populate: addCreatedByRolesPopulate(counterPopulate) };

    return strapi.entityService.findWithRelationCountsPage(uid, params);
  },

  findOneWithCreatorRolesAndCount(id, uid, populate) {
    const counterPopulate = getDeepPopulate(uid, populate, { countMany: true, countOne: true });
    const params = { populate: addCreatedByRolesPopulate(counterPopulate) };

    return strapi.entityService.findOne(uid, id, params);
  },

  async findOne(id, uid, populate) {
    const params = { populate: getDeepPopulate(uid, populate) };

    return strapi.entityService.findOne(uid, id, params);
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

    const params = {
      data: publishData,
      populate: getDeepPopulate(uid, null, { countMany: true, countOne: true }),
    };

    return strapi.entityService.create(uid, params);
  },

  update(entity, body, uid) {
    const publishData = omitPublishedAtField(body);

    const params = {
      data: publishData,
      populate: getDeepPopulate(uid, null, { countMany: true, countOne: true }),
    };

    return strapi.entityService.update(uid, entity.id, params);
  },

  delete(entity, uid) {
    const params = { populate: getDeepPopulate(uid, null, { countMany: true, countOne: true }) };

    return strapi.entityService.delete(uid, entity.id, params);
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

    const params = {
      data,
      populate: getDeepPopulate(uid, null, { countMany: true, countOne: true }),
    };

    return strapi.entityService.update(uid, entity.id, params);
  }),

  unpublish: wrapWithEmitEvent(ENTRY_UNPUBLISH, (entity, body = {}, uid) => {
    if (!entity[PUBLISHED_AT_ATTRIBUTE]) {
      throw new ApplicationError('already.draft');
    }

    const data = { ...body, [PUBLISHED_AT_ATTRIBUTE]: null };

    const params = {
      data,
      populate: getDeepPopulate(uid, null, { countMany: true, countOne: true }),
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
