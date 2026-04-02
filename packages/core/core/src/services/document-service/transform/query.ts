import type { UID } from '@strapi/types';

import { curry, assoc, omit, pipe } from 'lodash/fp';
import { parsePublicationFilter, getPublicationFilterCondition } from '../publication-filter';
import { parseHasPublishedVersion, getHasPublishedVersionCondition } from '../draft-and-publish';

import { pickAllowedQueryParams } from '../params';

const transformParamsToQuery = curry((uid: UID.Schema, params: any) => {
  const allowlisted = pickAllowedQueryParams(params ?? {});
  const query = strapi.get('query-params').transform(uid, allowlisted);

  const publicationFilter = parsePublicationFilter(allowlisted?.publicationFilter);
  // Deprecated param (boolean); prefer `publicationFilter`.
  const hasPublishedVersion = parseHasPublishedVersion(allowlisted?.hasPublishedVersion);
  const status: 'draft' | 'published' = allowlisted.status === 'published' ? 'published' : 'draft';

  const baseWhere = { ...params?.lookup, ...query.where };

  // `transformQueryParams` leaves `publicationFilter` / deprecated `hasPublishedVersion` on the query
  // object via `...rest`; the DB layer must not receive them as extra top-level keys.
  const stripPublicationParamsFromQuery = omit([
    'publicationFilter',
    'hasPublishedVersion',
  ] as const);

  // `publicationFilter` takes precedence when both are set (new API).
  if (publicationFilter !== undefined) {
    const publicationCondition = getPublicationFilterCondition(uid, publicationFilter, status);
    if (publicationCondition && Object.keys(publicationCondition).length > 0) {
      // Draft/publish is on `baseWhere` via `lookup`; publication modes add an `id` subquery.
      // Drop `query.filters` (status callback) so we do not stack duplicate `publishedAt` logic.
      // Use a single root `$and` so both fragments apply in one grouped predicate.
      const queryWithoutStatusFilters = pipe(
        omit(['filters'] as const),
        stripPublicationParamsFromQuery
      )(query);
      const hasBase = Object.keys(baseWhere).length > 0;
      const whereClause = hasBase
        ? { $and: [baseWhere, publicationCondition] }
        : publicationCondition;
      return assoc('where', whereClause, queryWithoutStatusFilters);
    }
  }

  // Deprecated `hasPublishedVersion` (boolean, documentId-only subquery). Use `publicationFilter`
  // for locale-aware cohorts (`never-published`, `has-published-version`, …).
  if (hasPublishedVersion !== undefined) {
    const existingFilters = query.filters;

    query.filters = ({ meta, ...rest }: { meta: { uid: UID.Schema } }) => {
      let existingResult = {};
      if (typeof existingFilters === 'function') {
        existingResult = existingFilters({ meta, ...rest }) || {};
      } else if (existingFilters) {
        existingResult = existingFilters;
      }

      const hasPublishedCondition = getHasPublishedVersionCondition(meta.uid, hasPublishedVersion);

      if (hasPublishedCondition) {
        const conditions = [existingResult, hasPublishedCondition].filter(
          (c) => Object.keys(c).length
        );
        return { $and: conditions };
      }

      return existingResult;
    };

    return assoc(
      'where',
      { ...params?.lookup, ...query.where },
      stripPublicationParamsFromQuery(query)
    );
  }

  return assoc('where', baseWhere, stripPublicationParamsFromQuery(query));
});

export { transformParamsToQuery };
