import type { UID } from '@strapi/types';

import { curry, assoc } from 'lodash/fp';
import { parseHasPublishedVersion, getHasPublishedVersionCondition } from '../draft-and-publish';

import { pickAllowedQueryParams } from '../params';

const transformParamsToQuery = curry((uid: UID.Schema, params: any) => {
  const allowlisted = pickAllowedQueryParams(params ?? {});
  const query = strapi.get('query-params').transform(uid, allowlisted);

  // Parse and validate hasPublishedVersion if provided (from allowlisted params only)
  const hasPublishedVersion = parseHasPublishedVersion(allowlisted?.hasPublishedVersion);

  // If hasPublishedVersion is set, wrap the existing filters function to also
  // apply the hasPublishedVersion condition. This ensures the condition is
  // applied to both root and nested (populate) queries.
  if (hasPublishedVersion !== undefined) {
    const existingFilters = query.filters;

    query.filters = ({ meta, ...rest }: { meta: { uid: UID.Schema } }) => {
      // Get the existing filters result (from status param)
      let existingResult = {};
      if (typeof existingFilters === 'function') {
        existingResult = existingFilters({ meta, ...rest }) || {};
      } else if (existingFilters) {
        existingResult = existingFilters;
      }

      // Get the hasPublishedVersion condition for this specific model
      const hasPublishedCondition = getHasPublishedVersionCondition(meta.uid, hasPublishedVersion);

      // Merge both conditions
      if (hasPublishedCondition) {
        const conditions = [existingResult, hasPublishedCondition].filter(
          (c) => Object.keys(c).length
        );
        return { $and: conditions };
      }

      return existingResult;
    };
  }

  return assoc('where', { ...params?.lookup, ...query.where }, query);
});

export { transformParamsToQuery };
