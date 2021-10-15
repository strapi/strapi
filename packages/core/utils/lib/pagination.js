'use strict';

const { merge, pipe, omit, isNil } = require('lodash/fp');

const STRAPI_DEFAULTS = {
  offset: {
    start: 0,
    limit: 10,
  },
  page: {
    page: 1,
    pageSize: 10,
  },
};

const paginationAttributes = ['start', 'limit', 'page', 'pageSize'];

/**
 * @param {number} limit
 * @param {number=} maxLimit
 */
const withMaxLimit = (limit, maxLimit = -1) => {
  if (maxLimit === -1 || limit < maxLimit) {
    return limit;
  }

  return maxLimit;
};

/**
 * Ensure minimum page & pageSize values (page >= 1, pageSize >= 0, start >= 0, limit >= 0)
 *
 * @param {{
 *  start: number,
 *  limit: number,
 * }} options
 */
const ensureMinValues = ({ start, limit }) => ({
  start: Math.max(start, 0),
  limit: Math.max(limit, 1),
});

/**
 * @param {number=} maxLimit
 */
const ensureMaxValues = (maxLimit = -1) => /**
 * @param {{
 *  start: number,
 *  limit: number,
 * }} options
 */ ({ start, limit }) => ({
  start,
  limit: withMaxLimit(limit, maxLimit),
});

/**
 * @param {{
 *  page?: number
 *  start?: number
 *  pageSize?: number
 *  limit?: number
 * }} args
 */
const withDefaultPagination = (args, { defaults = {}, maxLimit = -1 } = {}) => {
  const defaultValues = merge(STRAPI_DEFAULTS, defaults);

  const usePagePagination = !isNil(args.page) || !isNil(args.pageSize);
  const useOffsetPagination = !isNil(args.start) || !isNil(args.limit);

  const ensureValidValues = pipe(
    ensureMinValues,
    ensureMaxValues(maxLimit)
  );

  // If there is no pagination attribute, don't modify the payload
  if (!usePagePagination && !useOffsetPagination) {
    return merge(args, ensureValidValues(defaultValues.offset));
  }

  // If there is page & offset pagination attributes, throw an error
  if (usePagePagination && useOffsetPagination) {
    throw new Error('Cannot use both page & offset pagination in the same query');
  }

  /**
   * @type {{
   *  start:number,
   *  limit:number,
   * }}
   */
  // @ts-ignores
  const pagination = {};

  // Start / Limit
  if (useOffsetPagination) {
    const { start, limit } = merge(defaultValues.offset, args);

    Object.assign(pagination, { start, limit });
  }

  // Page / PageSize
  if (usePagePagination) {
    const { page, pageSize } = merge(defaultValues.page, args);

    Object.assign(pagination, {
      start: (page - 1) * pageSize,
      limit: pageSize,
    });
  }

  const replacePaginationAttributes = pipe(
    // Remove pagination attributes
    omit(paginationAttributes),
    // Merge the object with the new pagination + ensure minimum & maximum values
    merge(ensureValidValues(pagination))
  );

  return replacePaginationAttributes(args);
};

module.exports = { withDefaultPagination };
