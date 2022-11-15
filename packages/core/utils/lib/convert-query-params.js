/* eslint-disable max-classes-per-file */

'use strict';

/**
 * Converts the standard Strapi REST query params to a more usable format for querying
 * You can read more here: https://docs.strapi.io/developer-docs/latest/developer-resources/database-apis-reference/rest-api.html#filters
 */

const {
  isNil,
  toNumber,
  isInteger,
  has,
  isEmpty,
  isObject,
  isPlainObject,
  cloneDeep,
  get,
  mergeAll,
} = require('lodash/fp');
const _ = require('lodash');
const parseType = require('./parse-type');
const contentTypesUtils = require('./content-types');
const { PaginationError } = require('./errors');

const { PUBLISHED_AT_ATTRIBUTE } = contentTypesUtils.constants;

class InvalidOrderError extends Error {
  constructor() {
    super();
    this.message = 'Invalid order. order can only be one of asc|desc|ASC|DESC';
  }
}
class InvalidSortError extends Error {
  constructor() {
    super();
    this.message =
      'Invalid sort parameter. Expected a string, an array of strings, a sort object or an array of sort objects';
  }
}

const validateOrder = (order) => {
  if (!['asc', 'desc'].includes(order.toLocaleLowerCase())) {
    throw new InvalidOrderError();
  }
};

const convertCountQueryParams = (countQuery) => {
  return parseType({ type: 'boolean', value: countQuery });
};

const convertOrderingQueryParams = (ordering) => {
  return ordering;
};

/**
 * Sort query parser
 * @param {string} sortQuery - ex: id:asc,price:desc
 */
const convertSortQueryParams = (sortQuery) => {
  if (typeof sortQuery === 'string') {
    return sortQuery.split(',').map((value) => convertSingleSortQueryParam(value));
  }

  if (Array.isArray(sortQuery)) {
    return sortQuery.flatMap((sortValue) => convertSortQueryParams(sortValue));
  }

  if (_.isPlainObject(sortQuery)) {
    return convertNestedSortQueryParam(sortQuery);
  }

  throw new InvalidSortError();
};

const convertSingleSortQueryParam = (sortQuery) => {
  // split field and order param with default order to ascending
  const [field, order = 'asc'] = sortQuery.split(':');

  if (field.length === 0) {
    throw new Error('Field cannot be empty');
  }

  validateOrder(order);

  return _.set({}, field, order);
};

const convertNestedSortQueryParam = (sortQuery) => {
  const transformedSort = {};
  for (const field of Object.keys(sortQuery)) {
    const order = sortQuery[field];

    // this is a deep sort
    if (_.isPlainObject(order)) {
      transformedSort[field] = convertNestedSortQueryParam(order);
    } else {
      validateOrder(order);
      transformedSort[field] = order;
    }
  }

  return transformedSort;
};

/**
 * Start query parser
 * @param {string} startQuery
 */
const convertStartQueryParams = (startQuery) => {
  const startAsANumber = _.toNumber(startQuery);

  if (!_.isInteger(startAsANumber) || startAsANumber < 0) {
    throw new Error(`convertStartQueryParams expected a positive integer got ${startAsANumber}`);
  }

  return startAsANumber;
};

/**
 * Limit query parser
 * @param {string} limitQuery
 */
const convertLimitQueryParams = (limitQuery) => {
  const limitAsANumber = _.toNumber(limitQuery);

  if (!_.isInteger(limitAsANumber) || (limitAsANumber !== -1 && limitAsANumber < 0)) {
    throw new Error(`convertLimitQueryParams expected a positive integer got ${limitAsANumber}`);
  }

  if (limitAsANumber === -1) return null;

  return limitAsANumber;
};

class InvalidPopulateError extends Error {
  constructor() {
    super();
    this.message =
      'Invalid populate parameter. Expected a string, an array of strings, a populate object';
  }
}

// NOTE: we could support foo.* or foo.bar.* etc later on
const convertPopulateQueryParams = (populate, schema, depth = 0) => {
  if (depth === 0 && populate === '*') {
    return true;
  }

  if (typeof populate === 'string') {
    return populate.split(',').map((value) => _.trim(value));
  }

  if (Array.isArray(populate)) {
    // map convert
    return _.uniq(
      populate.flatMap((value) => {
        if (typeof value !== 'string') {
          throw new InvalidPopulateError();
        }

        return value.split(',').map((value) => _.trim(value));
      })
    );
  }

  if (_.isPlainObject(populate)) {
    return convertPopulateObject(populate, schema);
  }

  throw new InvalidPopulateError();
};

const convertPopulateObject = (populate, schema) => {
  if (!schema) {
    return {};
  }

  const { attributes } = schema;

  return Object.entries(populate).reduce((acc, [key, subPopulate]) => {
    const attribute = attributes[key];

    if (!attribute) {
      return acc;
    }

    if (typeof subPopulate === 'object' && 'on' in subPopulate) {
      return {
        ...acc,
        [key]: {
          on: Object.entries(subPopulate.on).reduce(
            (acc, [type, typeSubPopulate]) => ({
              ...acc,
              [type]: convertNestedPopulate(typeSubPopulate, strapi.getModel(type)),
            }),
            {}
          ),
        },
      };
    }

    // TODO: Deprecated way of handling dynamic zone populate queries. It's kept as is,
    // as removing it could break existing user queries but should be removed in V5.
    if (attribute.type === 'dynamiczone') {
      const populates = attribute.components
        .map((uid) => strapi.getModel(uid))
        .map((schema) => convertNestedPopulate(subPopulate, schema))
        .map((populate) => (populate === true ? {} : populate)) // cast boolean to empty object to avoid merging issues
        .filter((populate) => populate !== false);

      if (isEmpty(populates)) {
        return acc;
      }

      return {
        ...acc,
        [key]: mergeAll(populates),
      };
    }

    // NOTE: Retrieve the target schema UID.
    // Only handles basic relations, medias and component since it's not possible
    // to populate with options for a dynamic zone or a polymorphic relation
    let targetSchemaUID;

    if (attribute.type === 'relation') {
      targetSchemaUID = attribute.target;
    } else if (attribute.type === 'component') {
      targetSchemaUID = attribute.component;
    } else if (attribute.type === 'media') {
      targetSchemaUID = 'plugin::upload.file';
    } else {
      return acc;
    }

    const targetSchema = strapi.getModel(targetSchemaUID);

    if (!targetSchema) {
      return acc;
    }

    const populateObject = convertNestedPopulate(subPopulate, targetSchema);

    if (!populateObject) {
      return acc;
    }

    return {
      ...acc,
      [key]: populateObject,
    };
  }, {});
};

const convertNestedPopulate = (subPopulate, schema) => {
  if (_.isString(subPopulate)) {
    return parseType({ type: 'boolean', value: subPopulate, forceCast: true });
  }

  if (_.isBoolean(subPopulate)) {
    return subPopulate;
  }

  if (!_.isPlainObject(subPopulate)) {
    throw new Error(`Invalid nested populate. Expected '*' or an object`);
  }

  // TODO: We will need to consider a way to add limitation / pagination
  const { sort, filters, fields, populate, count, ordering } = subPopulate;

  const query = {};

  if (sort) {
    query.orderBy = convertSortQueryParams(sort);
  }

  if (filters) {
    query.where = convertFiltersQueryParams(filters, schema);
  }

  if (fields) {
    query.select = convertFieldsQueryParams(fields);
  }

  if (populate) {
    query.populate = convertPopulateQueryParams(populate, schema);
  }

  if (count) {
    query.count = convertCountQueryParams(count);
  }

  if (ordering) {
    query.ordering = convertOrderingQueryParams(ordering);
  }

  return query;
};

const convertFieldsQueryParams = (fields, depth = 0) => {
  if (depth === 0 && fields === '*') {
    return undefined;
  }

  if (typeof fields === 'string') {
    const fieldsValues = fields.split(',').map((value) => _.trim(value));
    return _.uniq(['id', ...fieldsValues]);
  }

  if (Array.isArray(fields)) {
    // map convert
    const fieldsValues = fields.flatMap((value) => convertFieldsQueryParams(value, depth + 1));
    return _.uniq(['id', ...fieldsValues]);
  }

  throw new Error('Invalid fields parameter. Expected a string or an array of strings');
};

const convertFiltersQueryParams = (filters, schema) => {
  // Filters need to be either an array or an object
  // Here we're only checking for 'object' type since typeof [] => object and typeof {} => object
  if (!isObject(filters)) {
    throw new Error('The filters parameter must be an object or an array');
  }

  // Don't mutate the original object
  const filtersCopy = cloneDeep(filters);

  return convertAndSanitizeFilters(filtersCopy, schema);
};

const convertAndSanitizeFilters = (filters, schema) => {
  if (!isPlainObject(filters)) {
    return filters;
  }

  if (Array.isArray(filters)) {
    return (
      filters
        // Sanitize each filter
        .map((filter) => convertAndSanitizeFilters(filter, schema))
        // Filter out empty filters
        .filter((filter) => !isObject(filter) || !isEmpty(filter))
    );
  }

  const removeOperator = (operator) => delete filters[operator];

  // Here, `key` can either be an operator or an attribute name
  for (const [key, value] of Object.entries(filters)) {
    const attribute = get(key, schema.attributes);

    // Handle attributes
    if (attribute) {
      // Relations
      if (attribute.type === 'relation') {
        filters[key] = convertAndSanitizeFilters(value, strapi.getModel(attribute.target));
      }

      // Components
      else if (attribute.type === 'component') {
        filters[key] = convertAndSanitizeFilters(value, strapi.getModel(attribute.component));
      }

      // Media
      else if (attribute.type === 'media') {
        filters[key] = convertAndSanitizeFilters(value, strapi.getModel('plugin::upload.file'));
      }

      // Dynamic Zones
      else if (attribute.type === 'dynamiczone') {
        removeOperator(key);
      }

      // Password attributes
      else if (attribute.type === 'password') {
        // Always remove password attributes from filters object
        removeOperator(key);
      }

      // Scalar attributes
      else {
        filters[key] = convertAndSanitizeFilters(value, schema);
      }
    }

    // Handle operators
    else if (['$null', '$notNull'].includes(key)) {
      filters[key] = parseType({ type: 'boolean', value: filters[key], forceCast: true });
    } else if (isObject(value)) {
      filters[key] = convertAndSanitizeFilters(value, schema);
    }

    // Remove empty objects & arrays
    if (isPlainObject(filters[key]) && isEmpty(filters[key])) {
      removeOperator(key);
    }
  }

  return filters;
};

const convertPublicationStateParams = (type, params = {}, query = {}) => {
  if (!type) {
    return;
  }

  const { publicationState } = params;

  if (!_.isNil(publicationState)) {
    if (!contentTypesUtils.constants.DP_PUB_STATES.includes(publicationState)) {
      throw new Error(
        `Invalid publicationState. Expected one of 'preview','live' received: ${publicationState}.`
      );
    }

    // NOTE: this is the query layer filters not the entity service filters
    query.filters = ({ meta }) => {
      if (publicationState === 'live' && has(PUBLISHED_AT_ATTRIBUTE, meta.attributes)) {
        return { [PUBLISHED_AT_ATTRIBUTE]: { $notNull: true } };
      }
    };
  }
};

const transformParamsToQuery = (uid, params) => {
  // NOTE: can be a CT, a Compo or nothing in the case of polymorphism (DZ & morph relations)
  const schema = strapi.getModel(uid);

  const query = {};

  const { _q, sort, filters, fields, populate, page, pageSize, start, limit } = params;

  if (!isNil(_q)) {
    query._q = _q;
  }

  if (!isNil(sort)) {
    query.orderBy = convertSortQueryParams(sort);
  }

  if (!isNil(filters)) {
    query.where = convertFiltersQueryParams(filters, schema);
  }

  if (!isNil(fields)) {
    query.select = convertFieldsQueryParams(fields);
  }

  if (!isNil(populate)) {
    query.populate = convertPopulateQueryParams(populate, schema);
  }

  const isPagePagination = !isNil(page) || !isNil(pageSize);
  const isOffsetPagination = !isNil(start) || !isNil(limit);

  if (isPagePagination && isOffsetPagination) {
    throw new PaginationError(
      'Invalid pagination attributes. You cannot use page and offset pagination in the same query'
    );
  }

  if (!isNil(page)) {
    const pageVal = toNumber(page);

    if (!isInteger(pageVal) || pageVal <= 0) {
      throw new PaginationError(
        `Invalid 'page' parameter. Expected an integer > 0, received: ${page}`
      );
    }

    query.page = pageVal;
  }

  if (!isNil(pageSize)) {
    const pageSizeVal = toNumber(pageSize);

    if (!isInteger(pageSizeVal) || pageSizeVal <= 0) {
      throw new PaginationError(
        `Invalid 'pageSize' parameter. Expected an integer > 0, received: ${page}`
      );
    }

    query.pageSize = pageSizeVal;
  }

  if (!isNil(start)) {
    query.offset = convertStartQueryParams(start);
  }

  if (!isNil(limit)) {
    query.limit = convertLimitQueryParams(limit);
  }

  convertPublicationStateParams(schema, params, query);

  return query;
};

module.exports = {
  convertSortQueryParams,
  convertStartQueryParams,
  convertLimitQueryParams,
  convertPopulateQueryParams,
  convertFiltersQueryParams,
  convertFieldsQueryParams,
  convertPublicationStateParams,
  transformParamsToQuery,
};
