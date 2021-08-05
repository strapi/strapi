'use strict';

const _ = require('lodash');
const { has, pick, omit, prop } = require('lodash/fp');
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
  relations: relationsUtils,
  pagination: paginationUtils,
} = require('@strapi/utils');

const { MANY_RELATIONS } = relationsUtils.constants;
const { PUBLISHED_AT_ATTRIBUTE } = contentTypesUtils.constants;

const uploadFiles = require('./utils/upload-files');

// TODO: those should be strapi events used by the webhooks not the other way arround
const { ENTRY_CREATE, ENTRY_UPDATE, ENTRY_DELETE } = webhookUtils.webhookEvents;

const omitComponentData = (contentType, data) => {
  const { attributes } = contentType;
  const componentAttributes = Object.keys(attributes).filter(attributeName =>
    contentTypesUtils.isComponentAttribute(attributes[attributeName])
  );

  return omit(componentAttributes, data);
};

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

// TODO: remove once the front is migrated
const convertOldQuery = params => {
  const obj = {};

  Object.keys(params).forEach(key => {
    if (key.startsWith('_')) {
      obj[key.slice(1)] = params[key];
    } else {
      obj[key] = params[key];
    }
  });

  return obj;
};

// TODO: move to Controller ?
const transformParamsToQuery = (uid, params = {}) => {
  const model = strapi.getModel(uid);

  const query = {};

  // TODO: check invalid values add defaults ....

  const {
    start,
    page,
    pageSize,
    limit,
    sort,
    filters,
    fields,
    populate,
    publicationState,
    _q,
    _where,
    ...rest
  } = params;

  if (_q) {
    query._q = _q;
  }

  if (page) {
    query.page = Number(page);
  }

  if (pageSize) {
    query.pageSize = Number(pageSize);
  }

  if (start) {
    query.offset = convertStartQueryParams(start);
  }

  if (limit) {
    query.limit = convertLimitQueryParams(limit);
  }

  if (sort) {
    query.orderBy = convertSortQueryParams(sort);
  }

  if (filters) {
    query.where = filters;
  }

  if (_where) {
    query.where = {
      $and: [_where].concat(query.where || []),
    };
  }

  if (fields) {
    query.select = _.castArray(fields);
  }

  if (populate) {
    const { populate } = params;
    query.populate = typeof populate === 'object' ? populate : _.castArray(populate);
  }

  // TODO: move to layer above ?
  if (publicationState && contentTypesUtils.hasDraftAndPublish(model)) {
    const { publicationState = 'live' } = params;

    const liveClause = {
      [PUBLISHED_AT_ATTRIBUTE]: {
        $notNull: true,
      },
    };

    if (publicationState === 'live') {
      query.where = {
        $and: [liveClause].concat(query.where || []),
      };

      // TODO: propagate nested publicationState filter somehow
    }
  }

  const finalQuery = {
    ...convertOldQuery(rest),
    ...query,
  };

  return finalQuery;
};

const pickSelectionParams = pick(['fields', 'populate']);

const paginateAndTransformToQuery = (uid, opts) => {
  // Paginate the opts
  const paginatedOpts = paginationUtils.withDefaultPagination(opts);

  // Transform the opts into a query & return it
  return transformParamsToQuery(uid, paginatedOpts);
};

const createDefaultImplementation = ({ strapi, db, eventHub, entityValidator }) => ({
  uploadFiles,

  async wrapOptions(options = {}) {
    return options;
  },

  emitEvent(uid, event, entity) {
    const model = strapi.getModel(uid);

    eventHub.emit(event, {
      model: model.modelName,
      entry: sanitizeEntity(entity, { model }),
    });
  },

  async find(uid, opts) {
    const { kind } = strapi.getModel(uid);

    const { params } = await this.wrapOptions(opts, { uid, action: 'find' });

    const query = paginateAndTransformToQuery(uid, params);

    // return first element and ignore filters
    if (kind === 'singleType') {
      return db.query(uid).findOne({});
    }

    return db.query(uid).findMany(query);
  },

  async findPage(uid, opts) {
    const { params } = await this.wrapOptions(opts, { uid, action: 'findPage' });

    const query = paginateAndTransformToQuery(uid, params);

    return db.query(uid).findPage(query);
  },

  async findWithRelationCounts(uid, opts) {
    const model = strapi.getModel(uid);

    const { params } = await this.wrapOptions(opts, { uid, action: 'findWithRelationCounts' });

    const query = transformParamsToQuery(uid, params);

    const { attributes } = model;

    const populate = (query.populate || []).reduce((populate, attributeName) => {
      const attribute = attributes[attributeName];

      if (
        MANY_RELATIONS.includes(attribute.relation) &&
        contentTypesUtils.isVisibleAttribute(model, attributeName)
      ) {
        populate[attributeName] = { count: true };
      } else {
        populate[attributeName] = true;
      }

      return populate;
    }, {});

    const { results, pagination } = await db.query(uid).findPage({
      ...query,
      populate,
    });

    return {
      results,
      pagination,
    };
  },

  async findOne(uid, entityId, opts) {
    const { params } = await this.wrapOptions(opts, { uid, action: 'findOne' });

    const query = transformParamsToQuery(uid, pickSelectionParams(params));

    return db.query(uid).findOne({ ...query, where: { id: entityId } });
  },

  async count(uid, opts) {
    const { params } = await this.wrapOptions(opts, { uid, action: 'count' });

    const query = paginateAndTransformToQuery(uid, params);

    return db.query(uid).count(query);
  },

  async create(uid, opts) {
    const { params, data, files } = await this.wrapOptions(opts, { uid, action: 'create' });

    const model = strapi.getModel(uid);

    const isDraft = contentTypesUtils.isDraft(data, model);
    const validData = await entityValidator.validateEntityCreation(model, data, { isDraft });

    // select / populate
    const query = transformParamsToQuery(uid, pickSelectionParams(params));

    // TODO: wrap into transaction
    const componentData = await createComponents(uid, validData);

    let entity = await db.query(uid).create({
      ...query,
      data: Object.assign(omitComponentData(model, validData), componentData),
    });

    // TODO: upload the files then set the links in the entity like with compo to avoid making too many queries
    if (files && Object.keys(files).length > 0) {
      await this.uploadFiles(uid, entity, files);
      entity = await this.findOne(uid, entity.id, { params });
    }

    this.emitEvent(uid, ENTRY_CREATE, entity);

    return entity;
  },

  async update(uid, entityId, opts) {
    const { params, data, files } = await this.wrapOptions(opts, { uid, action: 'update' });

    const model = strapi.getModel(uid);

    const entityToUpdate = await db.query(uid).findOne({ where: { id: entityId } });

    const isDraft = contentTypesUtils.isDraft(entityToUpdate, model);

    const validData = await entityValidator.validateEntityUpdate(model, data, {
      isDraft,
    });

    const query = transformParamsToQuery(uid, pickSelectionParams(params));

    // TODO: wrap in transaction
    const componentData = await updateComponents(uid, entityToUpdate, validData);

    let entity = await db.query(uid).update({
      ...query,
      where: { id: entityId },
      data: Object.assign(omitComponentData(model, validData), componentData),
    });

    // TODO: upload the files then set the links in the entity like with compo to avoid making too many queries
    if (files && Object.keys(files).length > 0) {
      await this.uploadFiles(uid, entity, files);
      entity = await this.findOne(uid, entity.id, { params });
    }

    this.emitEvent(uid, ENTRY_UPDATE, entity);

    return entity;
  },

  async delete(uid, entityId, opts) {
    const { params } = await this.wrapOptions(opts, { uid, action: 'delete' });

    // select / populate
    const query = transformParamsToQuery(uid, pickSelectionParams(params));

    const entityToDelete = await db.query(uid).findOne({
      ...query,
      where: { id: entityId },
    });

    if (!entityToDelete) {
      throw new Error('Entity not found');
    }

    await deleteComponents(uid, entityToDelete);
    await db.query(uid).delete({ where: { id: entityToDelete.id } });

    this.emitEvent(uid, ENTRY_DELETE, entityToDelete);

    return entityToDelete;
  },

  async deleteMany(uid, opts) {
    const { params } = await this.wrapOptions(opts, { uid, action: 'delete' });

    // select / populate
    const query = transformParamsToQuery(uid, params);

    return db.query(uid).deleteMany(query);
  },
});

// components can have nested compos so this must be recursive
const createComponent = async (uid, data) => {
  const model = strapi.getModel(uid);

  const componentData = await createComponents(uid, data);

  return await strapi.query(uid).create({
    data: Object.assign(omitComponentData(model, data), componentData),
  });
};

// components can have nested compos so this must be recursive
const updateComponent = async (uid, componentToUpdate, data) => {
  const model = strapi.getModel(uid);

  const componentData = await updateComponents(uid, componentToUpdate, data);

  return await strapi.query(uid).update({
    where: {
      id: componentToUpdate.id,
    },
    data: Object.assign(omitComponentData(model, data), componentData),
  });
};

// NOTE: we could generalize the logic to allow CRUD of relation directly in the DB layer
const createComponents = async (uid, data) => {
  const { attributes } = strapi.getModel(uid);

  const componentBody = {};

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
          componentValue.map(value => createComponent(componentUID, value))
        );

        // TODO: add order
        componentBody[attributeName] = components.map(({ id }) => id);
      } else {
        const component = await createComponent(componentUID, componentValue);
        componentBody[attributeName] = component.id;
      }

      continue;
    }

    if (attribute.type === 'dynamiczone') {
      const dynamiczoneValues = data[attributeName];

      if (!Array.isArray(dynamiczoneValues)) {
        throw new Error('Expected an array to create repeatable component');
      }

      componentBody[attributeName] = await Promise.all(
        dynamiczoneValues.map(async value => {
          const { id } = await createComponent(value.__component, value);
          return { id, __component: value.__component };
        })
      );

      continue;
    }
  }

  return componentBody;
};

const updateOrCreateComponent = (componentUID, value) => {
  if (value === null) {
    return null;
  }

  // update
  if (has('id', value)) {
    // TODO: verify the compo is associated with the entity
    return updateComponent(componentUID, { id: value.id }, value);
  }

  // create
  return createComponent(componentUID, value);
};

/*
  delete old components
  create or update
*/
const updateComponents = async (uid, entityToUpdate, data) => {
  const { attributes } = strapi.getModel(uid);

  const componentBody = {};

  for (const attributeName in attributes) {
    const attribute = attributes[attributeName];

    if (!has(attributeName, data)) {
      continue;
    }

    if (attribute.type === 'component') {
      const { component: componentUID, repeatable = false } = attribute;

      const componentValue = data[attributeName];

      await deleteOldComponents(uid, componentUID, entityToUpdate, attributeName, componentValue);

      if (repeatable === true) {
        if (!Array.isArray(componentValue)) {
          throw new Error('Expected an array to create repeatable component');
        }

        const components = await Promise.all(
          componentValue.map(value => updateOrCreateComponent(componentUID, value))
        );

        // TODO: add order
        componentBody[attributeName] = components.filter(_.negate(_.isNil)).map(({ id }) => id);
      } else {
        const component = await updateOrCreateComponent(componentUID, componentValue);
        componentBody[attributeName] = component && component.id;
      }

      continue;
    }

    if (attribute.type === 'dynamiczone') {
      const dynamiczoneValues = data[attributeName];

      await deleteOldDZComponents(uid, entityToUpdate, attributeName, dynamiczoneValues);

      if (!Array.isArray(dynamiczoneValues)) {
        throw new Error('Expected an array to create repeatable component');
      }

      componentBody[attributeName] = await Promise.all(
        dynamiczoneValues.map(async value => {
          const { id } = await updateOrCreateComponent(value.__component, value);
          return { id, __component: value.__component };
        })
      );

      continue;
    }
  }

  return componentBody;
};

const deleteOldComponents = async (
  uid,
  componentUID,
  entityToUpdate,
  attributeName,
  componentValue
) => {
  const previousValue = await strapi.query(uid).load(entityToUpdate, attributeName);

  const idsToKeep = _.castArray(componentValue)
    .filter(has('id'))
    .map(prop('id'));

  const allIds = _.castArray(previousValue)
    .filter(has('id'))
    .map(prop('id'));

  idsToKeep.forEach(id => {
    if (!allIds.includes(id)) {
      const err = new Error(
        `Some of the provided components in ${attributeName} are not related to the entity`
      );
      err.status = 400;
      throw err;
    }
  });

  const idsToDelete = _.difference(allIds, idsToKeep);

  if (idsToDelete.length > 0) {
    for (const idToDelete of idsToDelete) {
      await deleteComponent(componentUID, { id: idToDelete });
    }
  }
};

const deleteOldDZComponents = async (uid, entityToUpdate, attributeName, dynamiczoneValues) => {
  const previousValue = await strapi.query(uid).load(entityToUpdate, attributeName);

  const idsToKeep = _.castArray(dynamiczoneValues)
    .filter(has('id'))
    .map(({ id, __component }) => ({
      id,
      __component,
    }));

  const allIds = _.castArray(previousValue)
    .filter(has('id'))
    .map(({ id, __component }) => ({
      id,
      __component,
    }));

  idsToKeep.forEach(({ id, __component }) => {
    if (!allIds.find(el => el.id === id && el.__component === __component)) {
      const err = new Error(
        `Some of the provided components in ${attributeName} are not related to the entity`
      );
      err.status = 400;
      throw err;
    }
  });

  const idsToDelete = allIds.reduce((acc, { id, __component }) => {
    if (!idsToKeep.find(el => el.id === id && el.__component === __component)) {
      acc.push({ id, __component });
    }

    return acc;
  }, []);

  if (idsToDelete.length > 0) {
    for (const idToDelete of idsToDelete) {
      const { id, __component } = idToDelete;
      await deleteComponent(__component, { id });
    }
  }
};

const deleteComponent = async (uid, componentToDelete) => {
  await deleteComponents(uid, componentToDelete);
  await strapi.query(uid).delete({ where: { id: componentToDelete.id } });
};

const deleteComponents = async (uid, entityToDelete) => {
  const { attributes } = strapi.getModel(uid);

  for (const attributeName in attributes) {
    const attribute = attributes[attributeName];

    if (attribute.type === 'component') {
      const { component: componentUID } = attribute;

      const value = await strapi.query(uid).load(entityToDelete, attributeName);

      if (!value) {
        continue;
      }

      if (Array.isArray(value)) {
        await Promise.all(value.map(subValue => deleteComponent(componentUID, subValue)));
      } else {
        await deleteComponent(componentUID, value);
      }

      continue;
    }

    if (attribute.type === 'dynamiczone') {
      const value = await strapi.query(uid).load(entityToDelete, attributeName);

      if (!value) {
        continue;
      }

      if (Array.isArray(value)) {
        await Promise.all(value.map(subValue => deleteComponent(subValue.__component, subValue)));
      }

      continue;
    }
  }
};
