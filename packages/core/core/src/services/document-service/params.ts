import { pick } from 'lodash/fp';
import type { UID, Modules } from '@strapi/types';
import { SHARED_QUERY_PARAM_KEYS } from '@strapi/utils';

/**
 * Division of allowlists:
 *
 * - ALLOWED_DOCUMENT_PARAM_KEYS: keys that are passed through to the query builder
 *   (transformParamsToQuery → convert-query-params). Only these affect the actual query.
 *   Used by pickAllowedQueryParams() so unknown keys are stripped before the transformer.
 *
 * - ALLOWED_DOCUMENT_ROOT_PARAM_KEYS: keys we accept at the document service entry when
 *   api.documents.strictParams is true (checkUnrecognizedRootParams). Must be a superset
 *   of ALLOWED_DOCUMENT_PARAM_KEYS. Can include keys we accept but do not pass to the
 *   query builder (e.g. REST-shaped keys that callers send; we allow them then strip).
 */

/**
 * Keys passed to the query-params transformer. = SHARED_QUERY_PARAM_KEYS + withCount.
 */
export const ALLOWED_DOCUMENT_PARAM_KEYS = [...SHARED_QUERY_PARAM_KEYS, 'withCount'] as const;

/**
 * Keys allowed at root when strictParams is true. = ALLOWED_DOCUMENT_PARAM_KEYS plus:
 * - data: create/update payload (never part of query params)
 * - pagination, count, ordering: REST-style keys core-api may pass; accepted then stripped (query builder uses flat page/pageSize/start/limit and does not use count/ordering at root)
 */
export const ALLOWED_DOCUMENT_ROOT_PARAM_KEYS = [
  ...ALLOWED_DOCUMENT_PARAM_KEYS,
  'data',
  'pagination',
  'count',
  'ordering',
] as const;

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
