import { pick } from 'lodash/fp';
import type { UID, Modules } from '@strapi/types';
import { SHARED_QUERY_PARAM_KEYS } from '@strapi/utils';

/**
 * Root-level param keys allowed when building a query (transformParamsToQuery).
 * = SHARED_QUERY_PARAM_KEYS (from @strapi/utils) + document-layer key (withCount).
 */
export const ALLOWED_DOCUMENT_PARAM_KEYS = [...SHARED_QUERY_PARAM_KEYS, 'withCount'] as const;

/** Restrict to allowed query keys so only these reach the query-params transformer (security). */
export const pickAllowedQueryParams = (
  params: Record<string, unknown>
): Record<(typeof ALLOWED_DOCUMENT_PARAM_KEYS)[number], unknown> =>
  pick(ALLOWED_DOCUMENT_PARAM_KEYS as unknown as string[], params) as Record<
    (typeof ALLOWED_DOCUMENT_PARAM_KEYS)[number],
    unknown
  >;

const pickSelectionParams = <TUID extends UID.ContentType>(
  data: unknown
): Modules.Documents.Params.Pick<TUID, 'fields' | 'populate' | 'status'> => {
  return pick(['fields', 'populate', 'status'], data);
};

export { pickSelectionParams };
