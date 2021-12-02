'use strict';

const { assoc, has, prop, omit } = require('lodash/fp');
const strapiUtils = require('@strapi/utils');
const { ApplicationError } = require('@strapi/utils').errors;

const { hasDraftAndPublish, isVisibleAttribute } = strapiUtils.contentTypes;
const { PUBLISHED_AT_ATTRIBUTE, CREATED_BY_ATTRIBUTE } = strapiUtils.contentTypes.constants;
const { ENTRY_PUBLISH, ENTRY_UNPUBLISH } = strapiUtils.webhook.webhookEvents;
const { MANY_RELATIONS } = strapiUtils.relations.constants;

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

const findCreatorRoles = entity => {
  const createdByPath = `${CREATED_BY_ATTRIBUTE}.id`;

  if (has(createdByPath, entity)) {
    const creatorId = prop(createdByPath, entity);
    return strapi.query('admin::role').findMany({ where: { users: { id: creatorId } } });
  }

  return [];
};

// TODO: define when we use this one vs basic populate
const getDeepPopulate = (uid, populate, depth = 0) => {
  if (populate) {
    return populate;
  }

  if (depth > 2) {
    return {};
  }

  const { attributes } = strapi.getModel(uid);

  return Object.keys(attributes).reduce((populateAcc, attributeName) => {
    const attribute = attributes[attributeName];

    if (attribute.type === 'relation') {
      populateAcc[attributeName] = attribute.target
        ? { populate: getDeepPopulate(attribute.target, null, depth + 1) }
        : true;
    }

    if (attribute.type === 'component') {
      populateAcc[attributeName] = {
        populate: getDeepPopulate(attribute.component, null, depth + 1),
      };
    }

    if (attribute.type === 'media') {
      populateAcc[attributeName] = true;
    }

    if (attribute.type === 'dynamiczone') {
      populateAcc[attributeName] = {
        populate: (attribute.components || []).reduce((acc, componentUID) => {
          return Object.assign(acc, getDeepPopulate(componentUID, null, depth + 1));
        }, {}),
      };
    }

    return populateAcc;
  }, {});
};

// TODO: define when we use this one vs deep populate
const getBasePopulate = (uid, populate) => {
  if (populate) {
    return populate;
  }

  const { attributes } = strapi.getModel(uid);

  return Object.keys(attributes).filter(attributeName => {
    return ['relation', 'component', 'dynamiczone', 'media'].includes(
      attributes[attributeName].type
    );
  });
};

const getCounterPopulate = (uid, populate) => {
  const basePopulate = getBasePopulate(uid, populate);

  const model = strapi.getModel(uid);

  return basePopulate.reduce((populate, attributeName) => {
    const attribute = model.attributes[attributeName];

    if (MANY_RELATIONS.includes(attribute.relation) && isVisibleAttribute(model, attributeName)) {
      populate[attributeName] = { count: true };
    } else {
      populate[attributeName] = true;
    }

    return populate;
  }, {});
};

const addCreatedByRolesPopulate = populate => {
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
    const params = { ...opts, populate: getBasePopulate(uid, populate) };

    return strapi.entityService.findPage(uid, params);
  },

  findWithRelationCounts(opts, uid, populate) {
    const counterPopulate = addCreatedByRolesPopulate(getCounterPopulate(uid, populate));
    const params = { ...opts, populate: counterPopulate };

    return strapi.entityService.findWithRelationCounts(uid, params);
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

    const params = { data: publishData, populate: getDeepPopulate(uid) };

    return strapi.entityService.create(uid, params);
  },

  update(entity, body, uid) {
    const publishData = omitPublishedAtField(body);

    const params = { data: publishData, populate: getDeepPopulate(uid) };

    return strapi.entityService.update(uid, entity.id, params);
  },

  delete(entity, uid) {
    const params = { populate: getDeepPopulate(uid) };

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

    const params = { data, populate: getDeepPopulate(uid) };

    return strapi.entityService.update(uid, entity.id, params);
  }),

  unpublish: wrapWithEmitEvent(ENTRY_UNPUBLISH, (entity, body = {}, uid) => {
    if (!entity[PUBLISHED_AT_ATTRIBUTE]) {
      throw new ApplicationError('already.draft');
    }

    const data = { ...body, [PUBLISHED_AT_ATTRIBUTE]: null };

    const params = { data, populate: getDeepPopulate(uid) };

    return strapi.entityService.update(uid, entity.id, params);
  }),
});
