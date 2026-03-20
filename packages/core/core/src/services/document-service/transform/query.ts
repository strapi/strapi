import type { UID } from '@strapi/types';

import { curry, assoc, omit, pipe } from 'lodash/fp';
import { parsePublicationFilter, getPublicationFilterCondition } from '../publication-filter';

import { pickAllowedQueryParams } from '../params';

const transformParamsToQuery = curry((uid: UID.Schema, params: any) => {
  const allowlisted = pickAllowedQueryParams(params ?? {});
  const query = strapi.get('query-params').transform(uid, allowlisted);

  const publicationFilter = parsePublicationFilter(allowlisted?.publicationFilter);
  const status: 'draft' | 'published' = allowlisted.status === 'published' ? 'published' : 'draft';

  const baseWhere = { ...params?.lookup, ...query.where };

  // `transformQueryParams` leaves `publicationFilter` on the query object via `...rest`; the DB
  // layer must not receive it as an extra top-level key.
  const stripPublicationFilterFromQuery = omit(['publicationFilter'] as const);

  if (publicationFilter !== undefined) {
    const publicationCondition = getPublicationFilterCondition(uid, publicationFilter, status);
    if (publicationCondition && Object.keys(publicationCondition).length > 0) {
      // Draft/publish is on `baseWhere` via `lookup`; publication modes add an `id` subquery.
      // Drop `query.filters` (status callback) so we do not stack duplicate `publishedAt` logic.
      // Use a single root `$and` so both fragments apply in one grouped predicate.
      const queryWithoutStatusFilters = pipe(
        omit(['filters'] as const),
        stripPublicationFilterFromQuery
      )(query);
      const hasBase = Object.keys(baseWhere).length > 0;
      const whereClause = hasBase
        ? { $and: [baseWhere, publicationCondition] }
        : publicationCondition;
      return assoc('where', whereClause, queryWithoutStatusFilters);
    }
  }

  return assoc('where', baseWhere, stripPublicationFilterFromQuery(query));
});

export { transformParamsToQuery };
