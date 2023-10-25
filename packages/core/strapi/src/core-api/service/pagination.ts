import { has, toNumber, isUndefined } from 'lodash/fp';
import { errors } from '@strapi/utils';

interface BasePaginationParams {
  withCount?: boolean | 't' | '1' | 'true' | 'f' | '0' | 'false' | 0 | 1;
}

type PagedPagination = BasePaginationParams & {
  page?: number;
  pageSize?: number;
};

type OffsetPagination = BasePaginationParams & {
  start?: number;
  limit?: number;
};

export type PaginationParams = PagedPagination | OffsetPagination;

type PaginationInfo =
  | {
      page: number;
      pageSize: number;
    }
  | {
      start: number;
      limit: number;
    };

/**
 * Default limit values from config
 */
const getLimitConfigDefaults = () => ({
  defaultLimit: toNumber(strapi.config.get('api.rest.defaultLimit', 25)),
  maxLimit: toNumber(strapi.config.get('api.rest.maxLimit')) || null,
});

/**
 * Should maxLimit be used as the limit or not
 */
const shouldApplyMaxLimit = (
  limit: number,
  maxLimit: number | null,
  { isPagedPagination = false } = {}
) => (!isPagedPagination && limit === -1) || (maxLimit !== null && limit > maxLimit);

const shouldCount = (params: { pagination?: PaginationParams }) => {
  if (has('pagination.withCount', params)) {
    const withCount = params.pagination?.withCount;

    if (typeof withCount === 'boolean') {
      return withCount;
    }

    if (typeof withCount === 'undefined') {
      return false;
    }

    if (['true', 't', '1', 1].includes(withCount)) {
      return true;
    }

    if (['false', 'f', '0', 0].includes(withCount)) {
      return false;
    }

    throw new errors.ValidationError(
      'Invalid withCount parameter. Expected "t","1","true","false","0","f"'
    );
  }

  return Boolean(strapi.config.get('api.rest.withCount', true));
};

const isOffsetPagination = (pagination?: PaginationParams): pagination is OffsetPagination =>
  has('start', pagination) || has('limit', pagination);
const isPagedPagination = (pagination?: PaginationParams): pagination is PagedPagination =>
  has('page', pagination) || has('pageSize', pagination);

const getPaginationInfo = (params: { pagination?: PaginationParams }): PaginationInfo => {
  const { defaultLimit, maxLimit } = getLimitConfigDefaults();

  const { pagination } = params;

  const isPaged = isPagedPagination(pagination);
  const isOffset = isOffsetPagination(pagination);

  if (isOffset && isPaged) {
    throw new errors.ValidationError(
      'Invalid pagination parameters. Expected either start/limit or page/pageSize'
    );
  }

  if (!isOffset && !isPaged) {
    return {
      page: 1,
      pageSize: defaultLimit,
    };
  }

  if (isPagedPagination(pagination)) {
    const pageSize = isUndefined(pagination.pageSize)
      ? defaultLimit
      : Math.max(1, toNumber(pagination.pageSize));

    return {
      page: Math.max(1, toNumber(pagination.page || 1)),
      pageSize:
        typeof maxLimit === 'number' &&
        shouldApplyMaxLimit(pageSize, maxLimit, { isPagedPagination: true })
          ? maxLimit
          : Math.max(1, pageSize),
    };
  }

  const limit = isUndefined(pagination.limit) ? defaultLimit : toNumber(pagination.limit);

  return {
    start: Math.max(0, toNumber(pagination.start || 0)),
    limit: shouldApplyMaxLimit(limit, maxLimit) ? maxLimit || -1 : Math.max(1, limit),
  };
};

const convertPagedToStartLimit = (paginationInfo: PaginationInfo) => {
  if ('page' in paginationInfo) {
    const { page, pageSize } = paginationInfo;
    return {
      start: (page - 1) * pageSize,
      limit: pageSize,
    };
  }

  return paginationInfo;
};

const transformPaginationResponse = (paginationInfo: PaginationInfo, count: number) => {
  if ('page' in paginationInfo) {
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

export { getPaginationInfo, convertPagedToStartLimit, transformPaginationResponse, shouldCount };
