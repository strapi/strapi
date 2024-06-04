import { omit, has, toNumber, isNil } from 'lodash/fp';

import { errors, pagination } from '@strapi/utils';

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

const isOffsetPagination = (pagination?: PaginationParams): pagination is OffsetPagination =>
  has('start', pagination) || has('limit', pagination);

const isPagedPagination = (pagination?: PaginationParams): pagination is PagedPagination =>
  has('page', pagination) || has('pageSize', pagination) || !isOffsetPagination(pagination);

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

const getPaginationInfo = (params: { pagination?: PaginationParams }): PaginationInfo => {
  const { defaultLimit, maxLimit } = getLimitConfigDefaults();

  const { start, limit } = pagination.withDefaultPagination(params.pagination || {}, {
    defaults: { offset: { limit: defaultLimit }, page: { pageSize: defaultLimit } },
    maxLimit: maxLimit || -1,
  });

  return { start, limit };
};

const transformPaginationResponse = (
  paginationInfo: PaginationInfo,
  total: number | undefined,
  isPaged: boolean
) => {
  const transform = isPaged
    ? pagination.transformPagedPaginationInfo
    : pagination.transformOffsetPaginationInfo;

  const paginationResponse = transform(paginationInfo, total!);

  if (isNil(total)) {
    // Ignore total and pageCount if `total` value is not available.
    return omit(['total', 'pageCount'], paginationResponse) as ReturnType<typeof transform>;
  }

  return paginationResponse;
};

export { isPagedPagination, shouldCount, getPaginationInfo, transformPaginationResponse };
