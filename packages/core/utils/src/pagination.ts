import { merge, pipe, omit, isNil } from 'lodash/fp';
import { PaginationError } from './errors';

interface PaginationArgs {
  page: number;
  pageSize: number;
  start: number;
  limit: number;
}

export interface Pagination {
  start: number;
  limit: number;
}

export interface PagePatinationInformation {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface OffsetPaginationInformation {
  start: number;
  limit: number;
  total: number;
}

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

const withMaxLimit = (limit: number, maxLimit = -1) => {
  if (maxLimit === -1 || limit < maxLimit) {
    return limit;
  }

  return maxLimit;
};

// Ensure minimum page & pageSize values (page >= 1, pageSize >= 0, start >= 0, limit >= 0)
const ensureMinValues = ({ start, limit }: Pagination) => ({
  start: Math.max(start, 0),
  limit: limit === -1 ? limit : Math.max(limit, 1),
});

const ensureMaxValues =
  (maxLimit = -1) =>
  ({ start, limit }: { start: number; limit: number }) => ({
    start,
    limit: withMaxLimit(limit, maxLimit),
  });

// Apply maxLimit as the limit when limit is -1
const withNoLimit = (pagination: Pagination, maxLimit = -1) => ({
  ...pagination,
  limit: pagination.limit === -1 ? maxLimit : pagination.limit,
});

const withDefaultPagination = <T extends Partial<PaginationArgs>>(
  args: T,
  { defaults = {}, maxLimit = -1 } = {}
) => {
  const defaultValues = merge(STRAPI_DEFAULTS, defaults);

  const usePagePagination = !isNil(args.page) || !isNil(args.pageSize);
  const useOffsetPagination = !isNil(args.start) || !isNil(args.limit);

  const ensureValidValues = pipe(ensureMinValues, ensureMaxValues(maxLimit));

  // If there is no pagination attribute, don't modify the payload
  if (!usePagePagination && !useOffsetPagination) {
    return merge(args, ensureValidValues(defaultValues.offset));
  }

  // If there is page & offset pagination attributes, throw an error
  if (usePagePagination && useOffsetPagination) {
    throw new PaginationError('Cannot use both page & offset pagination in the same query');
  }

  const pagination: Pagination = {
    start: 0,
    limit: 0,
  };

  // Start / Limit
  if (useOffsetPagination) {
    const { start, limit } = merge(defaultValues.offset, args);

    Object.assign(pagination, { start, limit });
  }

  // Page / PageSize
  if (usePagePagination) {
    const { page, pageSize } = merge(defaultValues.page, {
      ...args,
      pageSize: Math.max(1, args.pageSize ?? 0),
    });

    Object.assign(pagination, {
      start: (page - 1) * pageSize,
      limit: pageSize,
    });
  }

  // Handle -1 limit
  Object.assign(pagination, withNoLimit(pagination, maxLimit));

  const replacePaginationAttributes = pipe(
    // Remove pagination attributes
    omit(paginationAttributes),
    // Merge the object with the new pagination + ensure minimum & maximum values
    merge(ensureValidValues(pagination))
  );

  return replacePaginationAttributes(args);
};

/**
 * Transform pagination information into a paginated response:
 * {
 *    page: number,
 *    pageSize: number,
 *    pageCount: number,
 *    total: number
 * }
 */
const transformPagedPaginationInfo = (
  paginationInfo: Partial<PaginationArgs>,
  total: number
): PagePatinationInformation => {
  if (!isNil(paginationInfo.page)) {
    const page = paginationInfo.page;
    const pageSize = paginationInfo.pageSize ?? total;

    return {
      page,
      pageSize,
      pageCount: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
      total,
    };
  }

  if (!isNil(paginationInfo.start)) {
    const start = paginationInfo.start;
    const limit = paginationInfo.limit ?? total;

    // Start limit to page page size
    return {
      page: Math.floor(start / limit) + 1,
      pageSize: limit,
      pageCount: limit > 0 ? Math.ceil(total / limit) : 0,
      total,
    };
  }

  // Default pagination
  return {
    ...paginationInfo,
    page: 1,
    pageSize: 10,
    pageCount: 1,
    total,
  };
};

/**
 * Transform pagination information into a offset response:
 * {
 *    start: number,
 *    limit: number,
 *    total: number
 * }
 */
const transformOffsetPaginationInfo = (
  paginationInfo: Partial<PaginationArgs>,
  total: number
): OffsetPaginationInformation => {
  if (!isNil(paginationInfo.page)) {
    const limit = paginationInfo.pageSize ?? total;
    const start = (paginationInfo.page - 1) * limit;

    return { start, limit, total };
  }

  if (!isNil(paginationInfo.start)) {
    const start = paginationInfo.start;
    const limit = paginationInfo.limit ?? total;

    // Start limit to page page size
    return { start, limit, total };
  }

  // Default pagination
  return {
    ...paginationInfo,
    start: 0,
    limit: 10,
    total,
  };
};

export { withDefaultPagination, transformPagedPaginationInfo, transformOffsetPaginationInfo };
