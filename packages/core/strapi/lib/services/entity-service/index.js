'use strict';

const _ = require('lodash');
const delegate = require('delegates');
const { InvalidTimeError, InvalidDateError, InvalidDateTimeError, InvalidRelationError } =
  require('@strapi/database').errors;
const {
  webhook: webhookUtils,
  contentTypes: contentTypesUtils,
  sanitize,
} = require('@strapi/utils');
const { ValidationError } = require('@strapi/utils').errors;
const { isAnyToMany } = require('@strapi/utils').relations;
const { transformParamsToQuery } = require('@strapi/utils').convertQueryParams;
const uploadFiles = require('../utils/upload-files');

const {
  omitComponentData,
  getComponents,
  createComponents,
  updateComponents,
  deleteComponents,
  cloneComponents,
} = require('./components');
const { pickSelectionParams } = require('./params');
const { applyTransforms } = require('./attributes');

const transformLoadParamsToQuery = (uid, field, params = {}, pagination = {}) => {
  return {
    ...transformParamsToQuery(uid, { populate: { [field]: params } }).populate[field],
    ...pagination,
  };
};

// TODO: those should be strapi events used by the webhooks not the other way arround
const { ENTRY_CREATE, ENTRY_UPDATE, ENTRY_DELETE } = webhookUtils.webhookEvents;

const databaseErrorsToTransform = [
  InvalidTimeError,
  InvalidDateTimeError,
  InvalidDateError,
  InvalidRelationError,
];

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
    // Ignore audit log events to prevent infinite loops
    if (uid === 'admin::audit-log') {
      return;
    }

    const model = strapi.getModel(uid);
    const sanitizedEntity = await sanitize.sanitizers.defaultSanitizeOutput(model, entity);

    eventHub.emit(event, {
      model: model.modelName,
      uid: model.uid,
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

    return db.query(uid).findPage(query);
  },

  async findWithRelationCounts(uid, opts) {
    const wrappedParams = await this.wrapParams(opts, { uid, action: 'findWithRelationCounts' });

    const query = transformParamsToQuery(uid, wrappedParams);

    return db.query(uid).findMany(query);
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

    const entityData = creationPipeline(
      Object.assign(omitComponentData(model, validData), componentData),
      {
        contentType: model,
      }
    );
    let entity = await db.query(uid).create({
      ...query,
      data: entityData,
    });

    // TODO: upload the files then set the links in the entity like with compo to avoid making too many queries
    if (files && Object.keys(files).length > 0) {
      await this.uploadFiles(uid, Object.assign(entityData, entity), files);
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
    const entityData = updatePipeline(
      Object.assign(omitComponentData(model, validData), componentData),
      {
        contentType: model,
      }
    );

    let entity = await db.query(uid).update({
      ...query,
      where: { id: entityId },
      data: entityData,
    });

    // TODO: upload the files then set the links in the entity like with compo to avoid making too many queries
    if (files && Object.keys(files).length > 0) {
      await this.uploadFiles(uid, Object.assign(entityData, entity), files);
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
    await deleteComponents(uid, componentsToDelete, { loadComponents: false });

    await this.emitEvent(uid, ENTRY_DELETE, entityToDelete);

    return entityToDelete;
  },

  async clone(uid, cloneId, opts) {
    const wrappedParams = await this.wrapParams(opts, { uid, action: 'clone' });
    const { data, files } = wrappedParams;

    const model = strapi.getModel(uid);

    const entityToClone = await db.query(uid).findOne({ where: { id: cloneId } });

    if (!entityToClone) {
      return null;
    }
    const isDraft = contentTypesUtils.isDraft(entityToClone, model);

    const validData = await entityValidator.validateEntityUpdate(
      model,
      data,
      {
        isDraft,
      },
      entityToClone
    );
    const query = transformParamsToQuery(uid, pickSelectionParams(wrappedParams));

    // TODO: wrap into transaction
    const componentData = await cloneComponents(uid, entityToClone, validData);

    const entityData = creationPipeline(
      Object.assign(omitComponentData(model, validData), componentData),
      {
        contentType: model,
      }
    );

    let entity = await db.query(uid).clone(cloneId, {
      ...query,
      data: entityData,
    });

    // TODO: upload the files then set the links in the entity like with compo to avoid making too many queries
    if (files && Object.keys(files).length > 0) {
      await this.uploadFiles(uid, Object.assign(entityData, entity), files);
      entity = await this.findOne(uid, entity.id, wrappedParams);
    }

    await this.emitEvent(uid, ENTRY_CREATE, entity);

    return entity;
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
    await Promise.all(
      componentsToDelete.map((compos) => deleteComponents(uid, compos, { loadComponents: false }))
    );

    // Trigger webhooks. One for each entity
    await Promise.all(entitiesToDelete.map((entity) => this.emitEvent(uid, ENTRY_DELETE, entity)));

    return deletedEntities;
  },

  load(uid, entity, field, params = {}) {
    if (!_.isString(field)) {
      throw new Error(`Invalid load. Expected "${field}" to be a string`);
    }

    return db.query(uid).load(entity, field, transformLoadParamsToQuery(uid, field, params));
  },

  loadPages(uid, entity, field, params = {}, pagination = {}) {
    if (!_.isString(field)) {
      throw new Error(`Invalid load. Expected "${field}" to be a string`);
    }

    const { attributes } = strapi.getModel(uid);
    const attribute = attributes[field];

    if (!isAnyToMany(attribute)) {
      throw new Error(`Invalid load. Expected "${field}" to be an anyToMany relational attribute`);
    }

    const query = transformLoadParamsToQuery(uid, field, params, pagination);

    return db.query(uid).loadPages(entity, field, query);
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
