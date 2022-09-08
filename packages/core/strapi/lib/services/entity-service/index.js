'use strict';

const _ = require('lodash');
const delegate = require('delegates');
const { InvalidTimeError, InvalidDateError, InvalidDateTimeError } =
  require('@strapi/database').errors;
const {
  webhook: webhookUtils,
  contentTypes: contentTypesUtils,
  sanitize,
} = require('@strapi/utils');
const { ValidationError } = require('@strapi/utils').errors;
const uploadFiles = require('../utils/upload-files');

const {
  omitComponentData,
  getComponents,
  createComponents,
  updateComponents,
  deleteComponents,
} = require('./components');
const { transformParamsToQuery, pickSelectionParams } = require('./params');
const { applyTransforms } = require('./attributes');

// TODO: those should be strapi events used by the webhooks not the other way arround
const { ENTRY_CREATE, ENTRY_UPDATE, ENTRY_DELETE } = webhookUtils.webhookEvents;

const databaseErrorsToTransform = [InvalidTimeError, InvalidDateTimeError, InvalidDateError];

const creationPipeline = (data, context) => {
  return applyTransforms(data, context);
};

const updatePipeline = (data, context) => {
  return applyTransforms(data, context);
};

/**
 * @type {import('.').default}
 */
const createDefaultImplementation = ({ strapi, db, eventHub, entityValidator }) => ({
  uploadFiles,

  async wrapParams(options = {}) {
    return options;
  },

  async emitEvent(uid, event, entity) {
    const model = strapi.getModel(uid);
    const sanitizedEntity = await sanitize.sanitizers.defaultSanitizeOutput(model, entity);

    eventHub.emit(event, {
      model: model.modelName,
      entry: sanitizedEntity,
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
  async findWithRelationCountsPage(uid, opts) {
    const wrappedParams = await this.wrapParams(opts, { uid, action: 'findWithRelationCounts' });

    const query = transformParamsToQuery(uid, wrappedParams);

    const { results, pagination } = await db.query(uid).findPage(query);

    return {
      results,
      pagination,
    };
  },

  async findWithRelationCounts(uid, opts) {
    const wrappedParams = await this.wrapParams(opts, { uid, action: 'findWithRelationCounts' });

    const query = transformParamsToQuery(uid, wrappedParams);

    const results = await db.query(uid).findMany(query);

    return results;
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
      data: creationPipeline(Object.assign(omitComponentData(model, validData), componentData), {
        contentType: model,
      }),
    });

    // TODO: upload the files then set the links in the entity like with compo to avoid making too many queries
    // FIXME: upload in components
    if (files && Object.keys(files).length > 0) {
      await this.uploadFiles(uid, entity, files);
      entity = await this.findOne(uid, entity.id, wrappedParams);
    }

    await this.emitEvent(uid, ENTRY_CREATE, entity);

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

    const validData = await entityValidator.validateEntityUpdate(
      model,
      data,
      {
        isDraft,
      },
      entityToUpdate
    );

    const query = transformParamsToQuery(uid, pickSelectionParams(wrappedParams));

    // TODO: wrap in transaction
    const componentData = await updateComponents(uid, entityToUpdate, validData);

    let entity = await db.query(uid).update({
      ...query,
      where: { id: entityId },
      data: updatePipeline(Object.assign(omitComponentData(model, validData), componentData), {
        contentType: model,
      }),
    });

    // TODO: upload the files then set the links in the entity like with compo to avoid making too many queries
    // FIXME: upload in components
    if (files && Object.keys(files).length > 0) {
      await this.uploadFiles(uid, entity, files);
      entity = await this.findOne(uid, entity.id, wrappedParams);
    }

    await this.emitEvent(uid, ENTRY_UPDATE, entity);

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

    const componentsToDelete = await getComponents(uid, entityToDelete);

    await db.query(uid).delete({ where: { id: entityToDelete.id } });
    await deleteComponents(uid, { ...entityToDelete, ...componentsToDelete });

    await this.emitEvent(uid, ENTRY_DELETE, entityToDelete);

    return entityToDelete;
  },

  // FIXME: used only for the CM to be removed
  async deleteMany(uid, opts) {
    const wrappedParams = await this.wrapParams(opts, { uid, action: 'delete' });

    // select / populate
    const query = transformParamsToQuery(uid, wrappedParams);

    const entitiesToDelete = await db.query(uid).findMany(query);

    if (!entitiesToDelete.length) {
      return null;
    }

    const componentsToDelete = await Promise.all(
      entitiesToDelete.map((entityToDelete) => getComponents(uid, entityToDelete))
    );

    const deletedEntities = await db.query(uid).deleteMany(query);
    await Promise.all(componentsToDelete.map((compos) => deleteComponents(uid, compos)));

    // Trigger webhooks. One for each entity
    await Promise.all(entitiesToDelete.map((entity) => this.emitEvent(uid, ENTRY_DELETE, entity)));

    return deletedEntities;
  },

  load(uid, entity, field, params = {}) {
    const { attributes } = strapi.getModel(uid);

    const attribute = attributes[field];

    const loadParams = {};

    switch (attribute.type) {
      case 'relation': {
        Object.assign(loadParams, transformParamsToQuery(attribute.target, params));
        break;
      }
      case 'component': {
        Object.assign(loadParams, transformParamsToQuery(attribute.component, params));
        break;
      }
      case 'dynamiczone': {
        Object.assign(loadParams, transformParamsToQuery(null, params));
        break;
      }
      case 'media': {
        Object.assign(loadParams, transformParamsToQuery('plugin::upload.file', params));
        break;
      }
      default: {
        break;
      }
    }

    return db.query(uid).load(entity, field, loadParams);
  },
});

module.exports = (ctx) => {
  const implementation = createDefaultImplementation(ctx);

  const service = {
    implementation,
    decorate(decorator) {
      if (typeof decorator !== 'function') {
        throw new Error(`Decorator must be a function, received ${typeof decorator}`);
      }

      this.implementation = { ...this.implementation, ...decorator(this.implementation) };
      return this;
    },
  };

  const delegator = delegate(service, 'implementation');

  // delegate every method in implementation
  Object.keys(service.implementation).forEach((key) => delegator.method(key));

  // wrap methods to handle Database Errors
  service.decorate((oldService) => {
    const newService = _.mapValues(
      oldService,
      (method, methodName) =>
        async function (...args) {
          try {
            return await oldService[methodName].call(this, ...args);
          } catch (error) {
            if (
              databaseErrorsToTransform.some(
                (errorToTransform) => error instanceof errorToTransform
              )
            ) {
              throw new ValidationError(error.message);
            }
            throw error;
          }
        }
    );

    return newService;
  });

  return service;
};
