'use strict';

const _ = require('lodash');

const {
  isSingleType,
  getNonWritableAttributes,
  constants: { DP_PUB_STATE_LIVE },
} = require('@strapi/utils').contentTypes;

const createSingleTypeService = require('./single-type');
const createCollectionTypeService = require('./collection-type');

/**
 * Returns a core api for the provided model
 * @param {{ model: object, strapi: object }} context
 * @returns {object}
 */
const createService = ({ model, strapi }) => {
  const utils = createUtils({ model });

  if (isSingleType(model)) {
    return createSingleTypeService({ model, strapi, utils });
  }

  return createCollectionTypeService({ model, strapi, utils });
};

/**
 * Default limit values from config
 * @return {{maxLimit: number, defaultLimit: number}}
 */
const getLimitConfigDefaults = () => ({
  defaultLimit: _.toNumber(strapi.config.get('api.rest.defaultLimit', 100)),
  maxLimit: _.toNumber(strapi.config.get('api.rest.maxLimit')) || null,
});

/**
 * if there is max limit set and limit exceeds this number, return configured max limit
 * @param {number} limit - limit you want to cap
 * @param {number?} maxLimit - maxlimit used has capping
 * @returns {number}
 */
const applyMaxLimit = (limit, maxLimit) => {
  if (maxLimit && (limit === -1 || limit > maxLimit)) {
    return maxLimit;
  }

  return limit;
};

const applyDefaultPagination = params => {
  const { defaultLimit, maxLimit } = getLimitConfigDefaults();

  if (_.isUndefined(params.pagination) || !_.isPlainObject(params.pagination)) {
    return {
      limit: defaultLimit,
    };
  }

  const { pagination } = params;

  if (!_.isUndefined(pagination.pageSize)) {
    return {
      page: pagination.page,
      pageSize: applyMaxLimit(_.toNumber(pagination.pageSize), maxLimit),
    };
  }

  const limit = _.isUndefined(pagination.limit) ? defaultLimit : _.toNumber(pagination.limit);
  return {
    start: pagination.start,
    limit: applyMaxLimit(limit, maxLimit),
  };
};

/**
 * Create default fetch params
 * @param {*} params
 * @returns
 */
const getFetchParams = (params = {}) => {
  return {
    publicationState: DP_PUB_STATE_LIVE,
    ...params,
    pagination: applyDefaultPagination(params),
  };
};

/**
 * Mixins
 */
const createUtils = ({ model }) => {
  return {
    // make sure to keep the call to getNonWritableAttributes dynamic
    sanitizeInput: data => _.omit(data, getNonWritableAttributes(model)),
    getFetchParams,
  };
};

module.exports = {
  createService,
  getFetchParams,
};
