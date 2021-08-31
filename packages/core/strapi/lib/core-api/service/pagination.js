'use strict';

const _ = require('lodash');
const { has, toNumber, isUndefined, isPlainObject } = require('lodash/fp');

/**
 * Default limit values from config
 * @return {{maxLimit: number, defaultLimit: number}}
 */
const getLimitConfigDefaults = () => ({
  defaultLimit: toNumber(strapi.config.get('api.rest.defaultLimit', 25)),
  maxLimit: toNumber(strapi.config.get('api.rest.maxLimit')) || null,
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

const isOffsetPagination = pagination => has('start', pagination) || has('limit', pagination);
const isPagedPagination = pagination => has('page', pagination) || has('page', pagination);

const getPaginationInfo = params => {
  const { defaultLimit, maxLimit } = getLimitConfigDefaults();

  if (isUndefined(params.pagination) || !isPlainObject(params.pagination)) {
    return {
      page: 1,
      pageSize: defaultLimit,
    };
  }

  const { pagination } = params;

  if (isOffsetPagination(pagination) && isPagedPagination(pagination)) {
    throw new Error('Invalid pagination parameters. Expected either start/limit or page/pageSize');
  }

  if (isPagedPagination(pagination)) {
    const pageSize = isUndefined(pagination.pageSize)
      ? defaultLimit
      : Math.max(1, toNumber(pagination.pageSize));

    return {
      page: Math.max(1, toNumber(pagination.page || 1)),
      pageSize: applyMaxLimit(pageSize, maxLimit),
    };
  }

  const limit = isUndefined(pagination.limit)
    ? defaultLimit
    : Math.max(1, toNumber(pagination.limit));

  return {
    start: Math.max(0, toNumber(pagination.start || 0)),
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

const transformPaginationResponse = (paginationInfo, count) => {
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
  getPaginationInfo,
  convertPagedToStartLimit,
  transformPaginationResponse,
  shouldCount,
};
