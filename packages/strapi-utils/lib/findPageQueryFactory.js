'use strict';

const DEFAULT_PAGINATION_OPTS = { page: 1, pageSize: 100 };

/**
 * Create a findPage query based on the find and count queries provided to the factory
 * @param find The find query
 * @param count The count query
 * @returns {function(*, ...[*]): {pagination: {pageCount: number, total: number, pageSize: number, page: number}, results: [*]}}
 */
const findPageQueryFactory = (find, count) => async (queryParams, ...args) => {
  const { page, pageSize, ...params } = withDefaultPagination(queryParams);

  const total = await count(params);

  const pagination = {
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
    total,
  };

  Object.assign(params, {
    _start: Math.max(pagination.page - 1, 0) * pagination.pageSize,
    _limit: pagination.pageSize,
  });

  const results = await find(params, ...args);

  return { results, pagination };
};

function withDefaultPagination(params) {
  const {
    page = DEFAULT_PAGINATION_OPTS.page,
    pageSize = DEFAULT_PAGINATION_OPTS.pageSize,
    ...rest
  } = params;

  return {
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    ...rest,
  };
}

module.exports = findPageQueryFactory;
