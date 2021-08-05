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

// Ensure minimum page & pageSize values (page >= 1, pageSize >= 0, start >= 0, limit >= 0)
const ensureMinValues = ({ start, limit }) => ({
  start: Math.max(start, 0),
  limit: Math.max(limit, 0),
});

const withDefaultPagination = (args, defaults = {}) => {
  const defaultValues = merge(STRAPI_DEFAULTS, defaults);

  const usePagePagination = !isNil(args.page) || !isNil(args.pageSize);
  const useOffsetPagination = !isNil(args.start) || !isNil(args.limit);

  // If there is no pagination attribute, don't modify the payload
  if (!usePagePagination && !useOffsetPagination) {
    return merge(args, defaultValues.offset);
  }

  // If there is page & offset pagination attributes, throw an error
  if (usePagePagination && useOffsetPagination) {
    throw new Error('Cannot use both page & offset pagination in the same query');
  }

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
    // Merge the object with the new pagination + ensure minimum values (page >= 1, pageSize >= 0)
    merge(ensureMinValues(pagination))
  );

  return replacePaginationAttributes(args);
};

module.exports = { withDefaultPagination };
