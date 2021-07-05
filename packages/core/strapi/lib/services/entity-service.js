'use strict';

const { pick } = require('lodash/fp');
const delegate = require('delegates');

const {
  convertSortQueryParams,
  convertLimitQueryParams,
  convertStartQueryParams,
} = require('@strapi/utils/lib/convert-rest-query-params');

const {
  sanitizeEntity,
  webhook: webhookUtils,
  contentTypes: contentTypesUtils,
} = require('@strapi/utils');
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

// TODO: move to Controller ?
const transformParamsToQuery = (params = {}) => {
  const query = {};

  // TODO: check invalid values add defaults ....

  if (params.start) {
    query.offset = convertStartQueryParams(params.start);
  }

  if (params.limit) {
    query.limit = convertLimitQueryParams(params.limit);
  }

  if (params.sort) {
    query.orderBy = convertSortQueryParams(params.sort);
  }

  if (params.filters) {
    query.where = params.filters;
  }

  if (params.fields) {
    query.select = params.fields;
  }

  if (params.populate) {
    const { populate } = params;
    query.populate = populate;
  }

  return query;
};

const pickSelectionParams = pick(['fields', 'populate']);

const createDefaultImplementation = ({ db, eventHub, entityValidator }) => ({
  uploadFiles,

  async wrapOptions(options = {}) {
    return options;
  },

  async find(uid, opts) {
    const { kind } = strapi.getModel(uid);

    const { params } = await this.wrapOptions(opts, { uid, action: 'find' });

    const query = transformParamsToQuery(params);

    // return first element and ignore filters
    if (kind === 'singleType') {
      return db.query(uid).findOne({});
    }

    return db.query(uid).findMany(query);
  },

  async findPage(uid, opts) {
    const { params } = await this.wrapOptions(opts, { uid, action: 'findPage' });

    const { page = 1, pageSize = 100 } = params;

    const pagination = {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    };

    const query = transformParamsToQuery(params);

    query.limit = pagination.pageSize;
    query.offset = pagination.page * pagination.pageSize;

    const [results, total] = await db.query(uid).findWithCount(query);

    return {
      results,
      pagination: {
        ...pagination,
        pageCount: Math.ceil(total / pageSize),
        total,
      },
    };
  },

  async findWithRelationCounts(uid, opts) {
    const { params, populate } = await this.wrapOptions(opts, {
      uid,
      action: 'findWithRelationCounts',
    });

    // TODO: to impl
    return db.query(uid).findWithRelationCounts(params, populate);
  },

  async findOne(uid, entityId, opts) {
    const { params } = await this.wrapOptions(opts, { uid, action: 'findOne' });

    const query = transformParamsToQuery(pickSelectionParams(params));

    return db.query(uid).findOne({ ...query, where: { id: entityId } });
  },

  async count(uid, opts) {
    const { params } = await this.wrapOptions(opts, { uid, action: 'count' });

    const query = transformParamsToQuery(params);

    return db.query(uid).count(query);
  },

  async create(uid, opts) {
    const { params, data, files } = await this.wrapOptions(opts, { uid, action: 'create' });

    const modelDef = strapi.getModel(uid);

    const isDraft = contentTypesUtils.isDraft(data, modelDef);

    const validData = await entityValidator.validateEntityCreation(modelDef, data, { isDraft });

    // select / populate
    const query = transformParamsToQuery(pickSelectionParams(params));

    const entry = await db.query(uid).create({ ...query, data: validData });

    // TODO: implement files
    // if (files && Object.keys(files).length > 0) {
    //   await this.uploadFiles(entry, files, { model });
    //   entry = await this.findOne({ params: { id: entry.id } }, { model });
    // }

    // TODO: Implement components CRUD ?

    eventHub.emit(ENTRY_CREATE, {
      model: modelDef.modelName,
      entry: sanitizeEntity(entry, { model: modelDef }),
    });

    return entry;
  },

  async update(uid, entityId, opts) {
    const { params, data, files } = await this.wrapOptions(opts, { uid, action: 'update' });

    const modelDef = strapi.getModel(uid);

    // const existingEntry = await db.query(uid).findOne({ where: { id: entityId } });

    // const isDraft = contentTypesUtils.isDraft(existingEntry, modelDef);

    // TODO: validate
    // // const validData = await entityValidator.validateEntityUpdate(modelDef, data, {
    // //   isDraft,
    // // });

    // select / populate
    const query = transformParamsToQuery(pickSelectionParams(params));

    let entry = await db.query(uid).update({ ...query, where: { id: entityId }, data });

    // TODO: implement files
    // if (files && Object.keys(files).length > 0) {
    //   await this.uploadFiles(entry, files, { model });
    //   entry = await this.findOne({ params: { id: entry.id } }, { model });
    // }

    eventHub.emit(ENTRY_UPDATE, {
      model: modelDef.modelName,
      entry: sanitizeEntity(entry, { model: modelDef }),
    });

    return entry;
  },

  async delete(uid, entityId, opts) {
    const { params } = await this.wrapOptions(opts, { uid, action: 'delete' });

    // select / populate
    const query = transformParamsToQuery(pickSelectionParams(params));

    const entry = await db.query(uid).delete({ ...query, where: { id: entityId } });

    const modelDef = strapi.getModel(uid);
    eventHub.emit(ENTRY_DELETE, {
      model: modelDef.modelName,
      entry: sanitizeEntity(entry, { model: modelDef }),
    });

    return entry;
  },

  // TODO: Implement search features

  async search(uid, opts) {
    const { params, populate } = await this.wrapOptions(opts, { uid, action: 'search' });

    return [];

    // return db.query(uid).search(params, populate);
  },

  async searchWithRelationCounts(uid, opts) {
    const { params, populate } = await this.wrapOptions(opts, {
      uid,
      action: 'searchWithRelationCounts',
    });

    return [];

    // return db.query(uid).searchWithRelationCounts(params, populate);
  },

  async searchPage(uid, opts) {
    const { params, populate } = await this.wrapOptions(opts, { uid, action: 'searchPage' });

    return [];

    // return db.query(uid).searchPage(params, populate);
  },

  async countSearch(uid, opts) {
    const { params } = await this.wrapOptions(opts, { uid, action: 'countSearch' });

    return [];

    // return db.query(uid).countSearch(params);
  },
});
