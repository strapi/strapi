'use strict';

const delegate = require('delegates');
const { pipe } = require('lodash/fp');

const {
  sanitizeEntity,
  webhook: webhookUtils,
  contentTypes: contentTypesUtils,
} = require('@strapi/utils');
const uploadFiles = require('../utils/upload-files');

const {
  omitComponentData,
  createComponents,
  updateComponents,
  deleteComponents,
} = require('./components');
const {
  transformCommonParams,
  transformPaginationParams,
  transformParamsToQuery,
  pickSelectionParams,
} = require('./params');

// TODO: those should be strapi events used by the webhooks not the other way arround
const { ENTRY_CREATE, ENTRY_UPDATE, ENTRY_DELETE } = webhookUtils.webhookEvents;

module.exports = ctx => {
  const implementation = createDefaultImplementation(ctx);

  const service = {
    implementation,
    decorate(decorator) {
      if (typeof decorator !== 'function') {
        throw new Error(`Decorator must be a function, received ${typeof decorator}`);
      }

      this.implementation = Object.assign({}, this.implementation, decorator(this.implementation));
      return this;
    },
  };

  const delegator = delegate(service, 'implementation');

  // delegate every method in implementation
  Object.keys(service.implementation).forEach(key => delegator.method(key));

  return service;
};

/**
 * @type {import('.').default}
 */
const createDefaultImplementation = ({ strapi, db, eventHub, entityValidator }) => ({
  uploadFiles,

  async wrapParams(options = {}) {
    return options;
  },

  emitEvent(uid, event, entity) {
    const model = strapi.getModel(uid);

    eventHub.emit(event, {
      model: model.modelName,
      entry: sanitizeEntity(entity, { model }),
    });
  },

  async findMany(uid, opts) {
    const { kind } = strapi.getModel(uid);

    const wrappedParams = await this.wrapParams(opts, { uid, action: 'findMany' });

    const query = transformParamsToQuery(uid, wrappedParams);

    if (kind === 'singleType') {
      return db.query(uid).findOne(query);
    }

    return db.query(uid).findMany(query);
  },

  async findPage(uid, opts) {
    const wrappedParams = await this.wrapParams(opts, { uid, action: 'findPage' });

    const query = transformParamsToQuery(uid, wrappedParams);

    return db.query(uid).findPage(query);
  },

  // TODO: streamline the logic based on the populate option
  async findWithRelationCounts(uid, opts) {
    const wrappedParams = await this.wrapParams(opts, { uid, action: 'findWithRelationCounts' });

    const query = transformParamsToQuery(uid, wrappedParams);

    const { results, pagination } = await db.query(uid).findPage(query);

    return {
      results,
      pagination,
    };
  },

  async findOne(uid, entityId, opts) {
    const wrappedParams = await this.wrapParams(opts, { uid, action: 'findOne' });

    const query = transformParamsToQuery(uid, pickSelectionParams(wrappedParams));

    return db.query(uid).findOne({ ...query, where: { id: entityId } });
  },

  async count(uid, opts) {
    const wrappedParams = await this.wrapParams(opts, { uid, action: 'count' });

    const query = transformParamsToQuery(uid, wrappedParams);

    return db.query(uid).count(query);
  },

  async create(uid, opts) {
    const wrappedParams = await this.wrapParams(opts, { uid, action: 'create' });
    const { data, files } = wrappedParams;

    const model = strapi.getModel(uid);

    const isDraft = contentTypesUtils.isDraft(data, model);
    const validData = await entityValidator.validateEntityCreation(model, data, { isDraft });

    // select / populate
    const query = transformParamsToQuery(uid, pickSelectionParams(wrappedParams));

    // TODO: wrap into transaction
    const componentData = await createComponents(uid, validData);

    let entity = await db.query(uid).create({
      ...query,
      data: Object.assign(omitComponentData(model, validData), componentData),
    });

    // TODO: upload the files then set the links in the entity like with compo to avoid making too many queries
    // FIXME: upload in components
    if (files && Object.keys(files).length > 0) {
      await this.uploadFiles(uid, entity, files);
      entity = await this.findOne(uid, entity.id, wrappedParams);
    }

    this.emitEvent(uid, ENTRY_CREATE, entity);

    return entity;
  },

  async update(uid, entityId, opts) {
    const wrappedParams = await this.wrapParams(opts, { uid, action: 'update' });
    const { data, files } = wrappedParams;

    const model = strapi.getModel(uid);

    const entityToUpdate = await db.query(uid).findOne({ where: { id: entityId } });

    if (!entityToUpdate) {
      return null;
    }

    const isDraft = contentTypesUtils.isDraft(entityToUpdate, model);

    const validData = await entityValidator.validateEntityUpdate(model, data, {
      isDraft,
    });

    const query = transformParamsToQuery(uid, pickSelectionParams(wrappedParams));

    // TODO: wrap in transaction
    const componentData = await updateComponents(uid, entityToUpdate, validData);

    let entity = await db.query(uid).update({
      ...query,
      where: { id: entityId },
      data: Object.assign(omitComponentData(model, validData), componentData),
    });

    // TODO: upload the files then set the links in the entity like with compo to avoid making too many queries
    // FIXME: upload in components
    if (files && Object.keys(files).length > 0) {
      await this.uploadFiles(uid, entity, files);
      entity = await this.findOne(uid, entity.id, wrappedParams);
    }

    this.emitEvent(uid, ENTRY_UPDATE, entity);

    return entity;
  },

  async delete(uid, entityId, opts) {
    const wrappedParams = await this.wrapParams(opts, { uid, action: 'delete' });

    // select / populate
    const query = transformParamsToQuery(uid, pickSelectionParams(wrappedParams));

    const entityToDelete = await db.query(uid).findOne({
      ...query,
      where: { id: entityId },
    });

    if (!entityToDelete) {
      return null;
    }

    await deleteComponents(uid, entityToDelete);
    await db.query(uid).delete({ where: { id: entityToDelete.id } });

    this.emitEvent(uid, ENTRY_DELETE, entityToDelete);

    return entityToDelete;
  },

  // FIXME: used only for the CM to be removed
  async deleteMany(uid, opts) {
    const wrappedParams = await this.wrapParams(opts, { uid, action: 'delete' });

    // select / populate
    const query = transformParamsToQuery(uid, wrappedParams);

    return db.query(uid).deleteMany(query);
  },

  load(uid, entity, field, params) {
    const { attributes } = strapi.getModel(uid);

    const attribute = attributes[field];

    const loadParams =
      attribute.type === 'relation'
        ? transformParamsToQuery(attribute.target, params)
        : pipe(
            transformCommonParams,
            transformPaginationParams
          )(params);

    return db.query(uid).load(entity, field, loadParams);
  },
});
