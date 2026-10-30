import _, { toNumber } from 'lodash';
import { errors, pagination as paginationUtils } from '@strapi/utils';

import type { Core, UID } from '@strapi/types';

/**
 * Resolve whether the count query should run, mirroring core-api's `shouldCount`.
 * Defaults to the `api.rest.withCount` config (true) when not specified on the request.
 */
const resolveWithCount = (strapi: Core.Strapi, pagination: Record<string, unknown>): boolean => {
  if (Object.hasOwn(pagination, 'withCount')) {
    const withCount = pagination.withCount;

    if (typeof withCount === 'boolean') {
      return withCount;
    }

    if (typeof withCount === 'undefined') {
      return false;
    }

    if (['true', 't', '1', 1].includes(withCount as string | number)) {
      return true;
    }

    if (['false', 'f', '0', 0].includes(withCount as string | number)) {
      return false;
    }

    throw new errors.ValidationError(
      'Invalid withCount parameter. Expected "t","1","true","false","0","f"'
    );
  }

  return Boolean(strapi.config.get('api.rest.withCount', true));
};

/**
 * REST-aware paginated find for the content API.
 *
 * Unlike the database `findPage` (used by the admin API), this honors the standard nested
 * `pagination` query object (`pagination[page]`, `pagination[pageSize]`,
 * `pagination[start]`, `pagination[limit]`, `pagination[withCount]`) and the
 * `api.rest.defaultLimit` / `api.rest.maxLimit` / `api.rest.withCount` config,
 * exactly like every other Strapi REST collection-type endpoint.
 */
export const findAndCountRestPage = async (
  strapi: Core.Strapi,
  uid: UID.Schema,
  query: any = {}
) => {
  const { pagination = {} } = query;

  const defaultLimit = toNumber(strapi.config.get('api.rest.defaultLimit', 25));
  const maxLimit = toNumber(strapi.config.get('api.rest.maxLimit')) || null;

  // Whether the consumer used page-based pagination (default) vs offset-based.
  const isOffset = Object.hasOwn(pagination, 'start') || Object.hasOwn(pagination, 'limit');
  const isPaged = !isOffset;

  // Resolve start/limit applying defaults and the maxLimit cap.
  const { start, limit } = paginationUtils.withDefaultPagination(pagination, {
    defaults: { offset: { limit: defaultLimit }, page: { pageSize: defaultLimit } },
    maxLimit: maxLimit || -1,
  });

  // Feed the transform the resolved offset/limit so it ignores the nested
  // `pagination` object (which it cannot read) and applies real bounds.
  const transformed = strapi
    .get('query-params')
    .transform(uid, { ...query, pagination: undefined, start, limit });

  const shouldCount = resolveWithCount(strapi, pagination);

  const [results, total] = await Promise.all([
    strapi.db.query(uid).findMany(transformed),
    shouldCount ? strapi.db.query(uid).count(transformed) : Promise.resolve(undefined),
  ]);

  const transform = isPaged
    ? paginationUtils.transformPagedPaginationInfo
    : paginationUtils.transformOffsetPaginationInfo;

  const paginationInfo = transform({ start, limit }, total as number);

  return {
    results,
    // Omit total & pageCount when counting is disabled (withCount=false).
    pagination: total == null ? _.omit(paginationInfo, ['total', 'pageCount']) : paginationInfo,
  };
};
