import { constants } from './content-types';

/**
 * Param keys shared by the Content API (query) and the document service (query building).
 * Add new shared params here only; both ALLOWED_QUERY_PARAM_KEYS and ALLOWED_DOCUMENT_PARAM_KEYS derive from this.
 */
export const SHARED_QUERY_PARAM_KEYS = [
  'filters',
  'sort',
  'fields',
  'populate',
  'status',
  'locale',
  'page',
  'pageSize',
  'start',
  'limit',
  '_q',
  'hasPublishedVersion',
] as const;

/**
 * Core query param keys allowed by the Content API (validate/sanitize query).
 * Used when strictParams is true. User code and plugins can add additional keys via contentAPI.addQueryParams.
 * = SHARED_QUERY_PARAM_KEYS + Content API–only keys (pagination, count, ordering).
 */
export const ALLOWED_QUERY_PARAM_KEYS = [
  ...SHARED_QUERY_PARAM_KEYS,
  'pagination',
  'count',
  'ordering',
] as const;

/**
 * Root-level body.data keys reserved for core (id, documentId).
 * These cannot be added as custom input params via contentAPI.addInputParams.
 */
export const RESERVED_INPUT_PARAM_KEYS = [
  constants.ID_ATTRIBUTE,
  constants.DOC_ID_ATTRIBUTE,
] as const;
