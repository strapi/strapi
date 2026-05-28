import type { UID } from '@strapi/types';

import { curry, assoc, omit } from 'lodash/fp';
import {
  parseHasPublishedVersionQueryParam,
  hasPublishedVersionBooleanToPublicationFilterMode,
  type PublicationFilterMode,
} from '@strapi/utils';

import { parsePublicationFilter, getPublicationFilterCondition } from '../publication-filter';

import { pickAllowedQueryParams } from '../params';

const transformParamsToQuery = curry((uid: UID.Schema, params: any) => {
  const rawParams = (params ?? {}) as Record<string, unknown>;
  const allowlisted = pickAllowedQueryParams(rawParams);
  const query = strapi.get('query-params').transform(uid, allowlisted);

  const explicitPublicationFilter = parsePublicationFilter(allowlisted.publicationFilter);
  const legacyHasPublishedVersion = parseHasPublishedVersionQueryParam(
    rawParams.hasPublishedVersion
  );

  let effectivePublicationFilter: PublicationFilterMode | undefined = explicitPublicationFilter;
  if (effectivePublicationFilter === undefined && legacyHasPublishedVersion !== undefined) {
    effectivePublicationFilter =
      hasPublishedVersionBooleanToPublicationFilterMode(legacyHasPublishedVersion);
  }

  const status: 'draft' | 'published' = allowlisted.status === 'published' ? 'published' : 'draft';

  const baseWhere = { ...params?.lookup, ...query.where };

  // `transformQueryParams` leaves `publicationFilter` / `hasPublishedVersion` on the query object
  // via `...rest`; the DB layer must not receive them as extra top-level keys.
  const stripPublicationParamsFromQuery = omit([
    'publicationFilter',
    'hasPublishedVersion',
  ] as const);

  // Publication filtering must go through `query.filters`, not only `where`, so the same
  // cohort logic applies to nested populate queries (each sub-query uses `meta.uid`).
  // Merging into `where` alone breaks populate cascade — see has-published-version API tests.
  if (effectivePublicationFilter !== undefined) {
    const existingFilters = query.filters;

    const wrappedFilters = ({ meta, ...rest }: { meta: { uid: UID.Schema } }) => {
      let existingResult = {};
      if (typeof existingFilters === 'function') {
        existingResult = existingFilters({ meta, ...rest }) || {};
      } else if (existingFilters) {
        existingResult = existingFilters;
      }

      const publicationCondition = getPublicationFilterCondition(
        meta.uid,
        effectivePublicationFilter,
        status
      );

      if (publicationCondition && Object.keys(publicationCondition).length > 0) {
        const conditions = [existingResult, publicationCondition].filter(
          (c) => Object.keys(c).length
        );
        return { $and: conditions };
      }

      return existingResult;
    };

    const queryWithoutPublicationParams = stripPublicationParamsFromQuery(query);

    return assoc(
      'where',
      baseWhere,
      assoc('filters', wrappedFilters, queryWithoutPublicationParams)
    );
  }

  return assoc('where', baseWhere, stripPublicationParamsFromQuery(query));
});

export { transformParamsToQuery };
