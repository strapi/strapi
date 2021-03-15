'use strict';

const _ = require('lodash');
const delegate = require('delegates');

const {
  sanitizeEntity,
  webhook: webhookUtils,
  contentTypes: contentTypesUtils,
} = require('strapi-utils');
const uploadFiles = require('./utils/upload-files');

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

const createDefaultImplementation = ({ db, eventHub, entityValidator }) => ({
  /**
   * expose some utils so the end users can use them
   */
  uploadFiles,

  /**
   * Returns default opt
   * it is async so decorators can do async processing
   * @param {object} params - query params to extend
   * @param {object=} ctx - Query context
   * @param {object} ctx.model - Model that is being used
   */
  async wrapOptions(options = {}) {
    return options;
  },

  /**
   * Returns a list of entries
   * @param {object} opts - Query options object (params, data, files, populate)
   * @param {object} ctx - Query context
   * @param {object} ctx.model - Model that is being used
   */
  async find(opts, { model }) {
    const { params, populate } = await this.wrapOptions(opts, { model, action: 'find' });

    const { kind } = db.getModel(model);

    // return first element and ignore filters
    if (kind === 'singleType') {
      const results = await db.query(model).find({ ...params, _limit: 1 }, populate);
      return _.first(results) || null;
    }

    return db.query(model).find(params, populate);
  },

  /**
   * Returns a paginated list of entries
   * @param {object} opts - Query options object (params, data, files, populate)
   * @param {object} ctx - Query context
   * @param {object} ctx.model - Model that is being used
   */
  async findPage(opts, { model }) {
    const { params, populate } = await this.wrapOptions(opts, { model, action: 'findPage' });

    return db.query(model).findPage(params, populate);
  },

  /**
   * Returns a list of entries with relation counters
   * @param {object} opts - Query options object (params, data, files, populate)
   * @param {object} ctx - Query context
   * @param {object} ctx.model - Model that is being used
   */
  async findWithRelationCounts(opts, { model }) {
    const { params, populate } = await this.wrapOptions(opts, {
      model,
      action: 'findWithRelationCounts',
    });

    return db.query(model).findWithRelationCounts(params, populate);
  },

  /**
   * Returns one entry
   * @param {object} opts - Query options object (params, data, files, populate)
   * @param {object} ctx - Query context
   * @param {object} ctx.model - Model that is being used
   */
  async findOne(opts, { model }) {
    const { params, populate } = await this.wrapOptions(opts, { model, action: 'findOne' });

    return db.query(model).findOne(params, populate);
  },

  /**
   * Returns a count of entries
   * @param {object} opts - Query options object (params, data, files, populate)
   * @param {object} ctx - Query context
   * @param {object} ctx.model - Model that is being used
   */
  async count(opts, { model }) {
    const { params } = await this.wrapOptions(opts, { model, action: 'count' });

    return db.query(model).count(params);
  },

  /**
   * Creates & returns a new entry
   * @param {object} opts - Query options object (params, data, files, populate)
   * @param {object} ctx - Query context
   * @param {object} ctx.model - Model that is being used
   */
  async create(opts, { model }) {
    const { data, files } = await this.wrapOptions(opts, { model, action: 'create' });

    const modelDef = db.getModel(model);

    const isDraft = contentTypesUtils.isDraft(data, modelDef);

    const validData = await entityValidator.validateEntityCreation(modelDef, data, { isDraft });

    let entry = await db.query(model).create(validData);

    if (files && Object.keys(files).length > 0) {
      await this.uploadFiles(entry, files, { model });
      entry = await this.findOne({ params: { id: entry.id } }, { model });
    }

    eventHub.emit(ENTRY_CREATE, {
      model: modelDef.modelName,
      entry: sanitizeEntity(entry, { model: modelDef }),
    });

    return entry;
  },

  /**
   * Updates & returns an existing entry
   * @param {object} opts - Query options object (params, data, files, populate)
   * @param {object} ctx - Query context
   * @param {object} ctx.model - Model that is being used
   */
  async update(opts, { model }) {
    const { params, data, files } = await this.wrapOptions(opts, { model, action: 'update' });

    const modelDef = db.getModel(model);
    const existingEntry = await db.query(model).findOne(params);

    const isDraft = contentTypesUtils.isDraft(existingEntry, modelDef);

    const validData = await entityValidator.validateEntityUpdate(modelDef, data, {
      isDraft,
    });

    let entry = await db.query(model).update(params, validData);

    if (files && Object.keys(files).length > 0) {
      await this.uploadFiles(entry, files, { model });
      entry = await this.findOne({ params: { id: entry.id } }, { model });
    }

    eventHub.emit(ENTRY_UPDATE, {
      model: modelDef.modelName,
      entry: sanitizeEntity(entry, { model: modelDef }),
    });

    return entry;
  },

  /**
   * Deletes & returns the entry that was deleted
   * @param {object} opts - Query options object (params, data, files, populate)
   * @param {object} ctx - Query context
   * @param {object} ctx.model - Model that is being used
   */
  async delete(opts, { model }) {
    const { params } = await this.wrapOptions(opts, { model, action: 'delete' });

    const entry = await db.query(model).delete(params);

    const modelDef = db.getModel(model);
    eventHub.emit(ENTRY_DELETE, {
      model: modelDef.modelName,
      entry: sanitizeEntity(entry, { model: modelDef }),
    });

    return entry;
  },

  /**
   * Returns a list of matching entries
   * @param {object} opts - Query options object (params, data, files, populate)
   * @param {object} ctx - Query context
   * @param {object} ctx.model - Model that is being used
   */
  async search(opts, { model }) {
    const { params, populate } = await this.wrapOptions(opts, { model, action: 'search' });

    return db.query(model).search(params, populate);
  },

  /**
   * Returns a list of matching entries with relations counters
   * @param {object} opts - Query options object (params, data, files, populate)
   * @param {object} ctx - Query context
   * @param {object} ctx.model - Model that is being used
   */
  async searchWithRelationCounts(opts, { model }) {
    const { params, populate } = await this.wrapOptions(opts, {
      model,
      action: 'searchWithRelationCounts',
    });

    return db.query(model).searchWithRelationCounts(params, populate);
  },

  /**
   * Returns a paginated list of matching entries
   * @param {object} opts - Query options object (params, data, files, populate)
   * @param {object} ctx - Query context
   * @param {object} ctx.model - Model that is being used
   */
  async searchPage(opts, { model }) {
    const { params, populate } = await this.wrapOptions(opts, { model, action: 'searchPage' });

    return db.query(model).searchPage(params, populate);
  },

  /**
   * Promise to count searched records
   * @param {object} opts - Query options object (params, data, files, populate)
   * @param {object} ctx - Query context
   * @param {object} ctx.model - Model that is being used
   */
  async countSearch(opts, { model }) {
    const { params } = await this.wrapOptions(opts, { model, action: 'countSearch' });

    return db.query(model).countSearch(params);
  },
});
