'use strict';

/**
 * Converts the standard Strapi REST query params to a moe usable format for querying
 * You can read more here: https://strapi.io/documentation/developer-docs/latest/developer-resources/content-api/content-api.html#filters
 */

const _ = require('lodash');

// const BOOLEAN_OPERATORS = ['or', 'and'];
const QUERY_OPERATORS = ['_where', '_or', '_and'];

/**
 * Sort query parser
 * @param {string} sortQuery - ex: id:asc,price:desc
 */
const convertSortQueryParams = sortQuery => {
  if (Array.isArray(sortQuery)) {
    return sortQuery.flatMap(sortValue => convertSortQueryParams(sortValue));
  }

  if (typeof sortQuery !== 'string') {
    throw new Error(`convertSortQueryParams expected a string, got ${typeof sortQuery}`);
  }

  const sortKeys = [];

  sortQuery.split(',').forEach(part => {
    // split field and order param with default order to ascending
    const [field, order = 'asc'] = part.split(':');

    if (field.length === 0) {
      throw new Error('Field cannot be empty');
    }

    if (!['asc', 'desc'].includes(order.toLocaleLowerCase())) {
      throw new Error('order can only be one of asc|desc|ASC|DESC');
    }

    sortKeys.push(_.set({}, field, order.toLowerCase()));
  });

  return sortKeys;
};

/**
 * Start query parser
 * @param {string} startQuery - ex: id:asc,price:desc
 */
const convertStartQueryParams = startQuery => {
  const startAsANumber = _.toNumber(startQuery);

  if (!_.isInteger(startAsANumber) || startAsANumber < 0) {
    throw new Error(`convertStartQueryParams expected a positive integer got ${startAsANumber}`);
  }

  return startAsANumber;
};

/**
 * Limit query parser
 * @param {string} limitQuery - ex: id:asc,price:desc
 */
const convertLimitQueryParams = limitQuery => {
  const limitAsANumber = _.toNumber(limitQuery);

  if (!_.isInteger(limitAsANumber) || (limitAsANumber !== -1 && limitAsANumber < 0)) {
    throw new Error(`convertLimitQueryParams expected a positive integer got ${limitAsANumber}`);
  }

  return limitAsANumber;
};

// NOTE: we could support foo.* or foo.bar.* etc later on
const convertPopulateQueryParams = (populate, depth = 0) => {
  if (depth === 0 && populate === '*') {
    return true;
  }

  if (typeof populate === 'string') {
    return populate.split(',').map(value => _.trim(value));
  }

  if (Array.isArray(populate)) {
    // map convert
    return populate.flatMap(value => convertPopulateQueryParams(value, depth + 1));
  }

  if (_.isPlainObject(populate)) {
    const transformedPopulate = {};
    for (const key in populate) {
      transformedPopulate[key] = convertNestedPopulate(populate[key]);
    }
    return transformedPopulate;
  }

  throw new Error(
    'Invalid populate parameter. Expected a string or an array of strings or a populate object'
  );
};

const convertNestedPopulate = subPopulate => {
  if (subPopulate === '*') {
    return true;
  }

  if (_.isBoolean(subPopulate)) {
    return subPopulate;
  }

  if (!_.isPlainObject(subPopulate)) {
    throw new Error(`Invalid nested populate. Expected '*' or an object`);
  }

  // TODO: We will need to consider a way to add limitation / pagination
  const { sort, filters, fields, populate } = subPopulate;

  const query = {};

  if (sort) {
    query.orderBy = convertSortQueryParams(sort);
  }

  if (filters) {
    query.where = convertFiltersQueryParams(filters);
  }

  if (fields) {
    query.select = _.castArray(fields);
  }

  if (populate) {
    query.populate = convertPopulateQueryParams(populate);
  }

  return query;
};

// NOTE: We could validate the parameters are on existing / non private attributes
const convertFiltersQueryParams = filters => filters;

// TODO: migrate
const VALID_REST_OPERATORS = [
  'eq',
  'ne',
  'in',
  'nin',
  'contains',
  'ncontains',
  'containss',
  'ncontainss',
  'lt',
  'lte',
  'gt',
  'gte',
  'null',
];

module.exports = {
  convertSortQueryParams,
  convertStartQueryParams,
  convertLimitQueryParams,
  convertPopulateQueryParams,
  convertFiltersQueryParams,
  VALID_REST_OPERATORS,
  QUERY_OPERATORS,
};
