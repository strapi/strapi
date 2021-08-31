'use strict';

const _ = require('lodash');

/**
 * Default limit values from config
 * @return {{maxLimit: number, defaultLimit: number}}
 */
const getLimitConfigDefaults = () => ({
  defaultLimit: _.toNumber(strapi.config.get('api.rest.defaultLimit', 25)),
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

const shouldCount = params => {
  if (_.has(params, 'pagination.withCount')) {
    return params.pagination.withCount === 'false' ? false : true;
  }

  return Boolean(strapi.config.get('api.rest.withCount', true));
};

const applyDefaultPagination = params => {
  const { defaultLimit, maxLimit } = getLimitConfigDefaults();

  if (_.isUndefined(params.pagination) || !_.isPlainObject(params.pagination)) {
    return {
      start: 0,
      limit: defaultLimit,
    };
  }

  const { pagination } = params;

  if (!_.isUndefined(pagination.pageSize) || !_.isUndefined(pagination.page)) {
    const pageSize = _.isUndefined(pagination.pageSize)
      ? defaultLimit
      : Math.max(1, _.toNumber(pagination.pageSize));

    return {
      page: Math.max(1, _.toNumber(pagination.page || 1)),
      pageSize: applyMaxLimit(pageSize, maxLimit),
    };
  }

  const limit = _.isUndefined(pagination.limit)
    ? defaultLimit
    : Math.max(1, _.toNumber(pagination.limit));

  return {
    start: Math.max(0, _.toNumber(pagination.start || 0)),
    limit: applyMaxLimit(limit, maxLimit),
  };
};

const convertPagedToStartLimit = pagination => {
  if (_.has(pagination, 'page')) {
    const { page, pageSize } = pagination;
    return {
      start: (page - 1) * pageSize,
      limit: pageSize,
    };
  }

  return pagination;
};

const formatPaginationResponse = (paginationInfo, count) => {
  if (paginationInfo.page) {
    return {
      ...paginationInfo,
      pageCount: Math.ceil(count / paginationInfo.pageSize),
      total: count,
    };
  }

  return {
    ...paginationInfo,
    total: count,
  };
};

module.exports = {
  applyDefaultPagination,
  convertPagedToStartLimit,
  shouldCount,
  formatPaginationResponse,
};
