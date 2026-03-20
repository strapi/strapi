import type { UID } from '@strapi/types';

import { curry, assoc } from 'lodash/fp';
import { parseHasPublishedVersion, getHasPublishedVersionCondition } from '../draft-and-publish';
import { parsePublicationFilter, getPublicationFilterCondition } from '../publication-filter';

import { pickAllowedQueryParams } from '../params';

const transformParamsToQuery = curry((uid: UID.Schema, params: any) => {
  const allowlisted = pickAllowedQueryParams(params ?? {});
  const query = strapi.get('query-params').transform(uid, allowlisted);

  const hasPublishedVersion = parseHasPublishedVersion(allowlisted?.hasPublishedVersion);
  const publicationFilter = parsePublicationFilter(allowlisted?.publicationFilter);
  const status: 'draft' | 'published' = allowlisted.status === 'published' ? 'published' : 'draft';

  if (hasPublishedVersion !== undefined || publicationFilter !== undefined) {
    const existingFilters = query.filters;

    query.filters = ({ meta, ...rest }: { meta: { uid: UID.Schema } }) => {
      let existingResult = {};
      if (typeof existingFilters === 'function') {
        existingResult = existingFilters({ meta, ...rest }) || {};
      } else if (existingFilters) {
        existingResult = existingFilters;
      }

      const pieces: Record<string, unknown>[] = [];

      if (Object.keys(existingResult).length > 0) {
        pieces.push(existingResult);
      }

      if (hasPublishedVersion !== undefined) {
        const hasPublishedCondition = getHasPublishedVersionCondition(
          meta.uid,
          hasPublishedVersion
        );
        if (hasPublishedCondition && Object.keys(hasPublishedCondition).length > 0) {
          pieces.push(hasPublishedCondition);
        }
      }

      if (publicationFilter !== undefined) {
        const publicationCondition = getPublicationFilterCondition(
          meta.uid,
          publicationFilter,
          status
        );
        if (publicationCondition && Object.keys(publicationCondition).length > 0) {
          pieces.push(publicationCondition);
        }
      }

      if (pieces.length === 0) {
        return {};
      }

      if (pieces.length === 1) {
        return pieces[0];
      }

      return { $and: pieces };
    };
  }

  return assoc('where', { ...params?.lookup, ...query.where }, query);
});

export { transformParamsToQuery };
