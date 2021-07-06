'use strict';

const { has, pick } = require('lodash/fp');
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

    // TODO: transform page pageSize
    const query = transformParamsToQuery(params);

    return db.query(uid).findPage(query);
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

    // TODO: wrap into transaction

    const componentData = await createComponents(uid, validData);

    const entity = await db.query(uid).create({
      ...query,
      data: Object.assign(validData, componentData),
    });

    // TODO: Implement components CRUD

    // TODO: implement files outside of the entity service
    // if (files && Object.keys(files).length > 0) {
    //   await this.uploadFiles(entry, files, { model });
    //   entry = await this.findOne({ params: { id: entry.id } }, { model });
    // }

    eventHub.emit(ENTRY_CREATE, {
      model: modelDef.modelName,
      entry: sanitizeEntity(entity, { model: modelDef }),
    });

    return entity;
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

    // TODO: wrap in transaction

    const componentData = await updateComponents(uid, data);

    let entry = await db.query(uid).update({
      ...query,
      where: { id: entityId },
      data: Object.assign(data, componentData),
    });

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

  async deleteMany(uid, opts) {
    const { params } = await this.wrapOptions(opts, { uid, action: 'delete' });

    // select / populate
    const query = transformParamsToQuery(pickSelectionParams(params));

    return db.query(uid).deleteMany(query);
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

// TODO: Generalize the logic to CRUD relation directly in the DB layer
const createComponents = async (uid, data) => {
  const { attributes } = strapi.getModel(uid);

  for (const attributeName in attributes) {
    const attribute = attributes[attributeName];

    if (!has(attributeName, data)) {
      continue;
    }

    if (attribute.type === 'component') {
      const { component: componentUID, repeatable = false } = attribute;

      const componentValue = data[attributeName];

      if (componentValue === null) {
        continue;
      }

      if (repeatable === true) {
        if (!Array.isArray(componentValue)) {
          throw new Error('Expected an array to create repeatable component');
        }

        const components = await Promise.all(
          componentValue.map(value => {
            return strapi.query(componentUID).create({ data: value });
          })
        );

        return {
          [attributeName]: components.map(({ id }, idx) => {
            // TODO: add & support pivot data in DB
            return id;
          }),
        };
      } else {
        const component = await strapi.query(componentUID).create({ data: componentValue });

        return {
          // TODO: add & support pivot data in DB
          [attributeName]: component.id,
        };
      }
    }

    if (attribute.type === 'dynamiczone') {
      const dynamiczoneValues = data[attributeName];

      if (!Array.isArray(dynamiczoneValues)) {
        throw new Error('Expected an array to create repeatable component');
      }

      const components = await Promise.all(
        dynamiczoneValues.map(value => {
          return strapi.query(value.__component).create({ data: value });
        })
      );

      return {
        [attributeName]: components.map(({ id }, idx) => {
          // TODO: add & support pivot data in DB
          return id;
        }),
      };
    }
  }
};

const updateOrCreateComponent = (componentUID, value) => {
  // update
  if (has('id', value)) {
    return strapi.query(componentUID).update({ where: { id: value.id }, data: value });
  }

  // create
  return strapi.query(componentUID).create({ data: value });
};

const updateComponents = async (uid, data) => {
  // TODO: clear old -> done in the updateRelation

  const { attributes } = strapi.getModel(uid);

  for (const attributeName in attributes) {
    const attribute = attributes[attributeName];

    if (!has(attributeName, data)) {
      continue;
    }

    if (attribute.type === 'component') {
      const { component: componentUID, repeatable = false } = attribute;

      const componentValue = data[attributeName];

      if (componentValue === null) {
        continue;
      }

      if (repeatable === true) {
        if (!Array.isArray(componentValue)) {
          throw new Error('Expected an array to create repeatable component');
        }

        const components = await Promise.all(
          componentValue.map(value => updateOrCreateComponent(componentUID, value))
        );

        return {
          [attributeName]: components.map(({ id }, idx) => {
            // TODO: add & support pivot data in DB
            return id;
          }),
        };
      } else {
        const component = await updateOrCreateComponent(componentUID, componentValue);

        return {
          // TODO: add & support pivot data in DB
          [attributeName]: component.id,
        };
      }
    }

    if (attribute.type === 'dynamiczone') {
      const dynamiczoneValues = data[attributeName];

      if (!Array.isArray(dynamiczoneValues)) {
        throw new Error('Expected an array to create repeatable component');
      }

      const components = await Promise.all(
        dynamiczoneValues.map(value => updateOrCreateComponent(value.__component, value))
      );

      return {
        [attributeName]: components.map(({ id }, idx) => {
          // TODO: add & support pivot data in DB
          return id;
        }),
      };
    }
  }
};
