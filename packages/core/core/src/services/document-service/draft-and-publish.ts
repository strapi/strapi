import { assoc, curry } from 'lodash/fp';

import type { Modules, Struct, UID } from '@strapi/types';
import { contentTypes, errors } from '@strapi/utils';

type ParamsTransform = (params: Modules.Documents.Params.All) => Modules.Documents.Params.All;

type TransformWithContentType = (
  contentType: Struct.SingleTypeSchema | Struct.CollectionTypeSchema,
  params: Modules.Documents.Params.All
) => Modules.Documents.Params.All;

type AsyncTransformWithUid = (
  contentType: Struct.SingleTypeSchema | Struct.CollectionTypeSchema,
  uid: UID.Schema,
  params: Modules.Documents.Params.All
) => Promise<Modules.Documents.Params.All>;

/**
 * DP enabled -> set status to draft
 * DP disabled -> Used mostly for parsing relations, so there is not a need for a default.
 */
const setStatusToDraft: TransformWithContentType = (contentType, params) => {
  if (!contentTypes.hasDraftAndPublish(contentType) && params.status) {
    return params;
  }

  return assoc('status', 'draft', params);
};

/**
 * Adds a default status of `draft` to the params
 */
const defaultToDraft: ParamsTransform = (params) => {
  // Default to draft if no status is provided or it's invalid
  if (!params.status || params.status !== 'published') {
    return assoc('status', 'draft', params);
  }

  return params;
};

/**
 * DP disabled -> ignore status
 * DP enabled -> set status to draft if no status is provided or it's invalid
 */
const defaultStatus: TransformWithContentType = (contentType, params) => {
  if (!contentTypes.hasDraftAndPublish(contentType)) {
    return params;
  }

  // Default to draft if no status is provided or it's invalid
  if (!params.status || params.status !== 'published') {
    return defaultToDraft(params);
  }

  return params;
};

/**
 * In mutating actions we don't want user to set the publishedAt attribute.
 */
const filterDataPublishedAt: ParamsTransform = (params) => {
  if (params?.data?.publishedAt) {
    return assoc(['data', 'publishedAt'], null, params);
  }

  return params;
};

/**
 * Add status lookup query to the params
 */
const statusToLookup: TransformWithContentType = (contentType, params) => {
  if (!contentTypes.hasDraftAndPublish(contentType)) {
    return params;
  }

  const lookup = params.lookup || {};

  switch (params?.status) {
    case 'published':
      return assoc(['lookup', 'publishedAt'], { $notNull: true }, params);
    case 'draft':
      return assoc(['lookup', 'publishedAt'], { $null: true }, params);
    default:
      break;
  }

  return assoc('lookup', lookup, params);
};

/**
 * Translate publication status parameter into the data that will be saved
 */
const statusToData: TransformWithContentType = (contentType, params) => {
  if (!contentTypes.hasDraftAndPublish(contentType)) {
    return assoc(['data', 'publishedAt'], new Date(), params);
  }

  switch (params?.status) {
    case 'published':
      return assoc(['data', 'publishedAt'], new Date(), params);
    case 'draft':
      return assoc(['data', 'publishedAt'], null, params);
    default:
      break;
  }

  return params;
};

/**
 * Parses and sanitizes the hasPublishedVersion parameter.
 * Returns normalized boolean value or undefined if not provided.
 * Throws ValidationError for invalid input (400 response).
 */
const parseHasPublishedVersion = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  throw new errors.ValidationError(
    "Invalid value for 'hasPublishedVersion'. Expected boolean or 'true'/'false' string."
  );
};

/**
 * Filter documents based on whether they have a published version.
 * Enables document-level filtering to find "never published" documents.
 *
 * Uses subquery approach for optimal performance - the database handles
 * the filtering in a single query rather than materializing all IDs.
 */
const hasPublishedVersionToLookup: AsyncTransformWithUid = async (contentType, uid, params) => {
  if (!contentTypes.hasDraftAndPublish(contentType)) {
    return params;
  }

  const rawValue = params.hasPublishedVersion;

  // Parse and normalize the value (throws 400 on invalid input)
  const hasPublishedVersion = parseHasPublishedVersion(rawValue);

  // Skip if not specified (preserve existing behavior)
  if (hasPublishedVersion === undefined) {
    return params;
  }

  // Get table and column names from metadata
  const meta = strapi.db.metadata.get(uid);
  const tableName = meta.tableName;
  const documentIdAttr = meta.attributes.documentId;
  const publishedAtAttr = meta.attributes.publishedAt;
  const documentIdColumn =
    ('columnName' in documentIdAttr && documentIdAttr.columnName) || 'document_id';
  const publishedAtColumn =
    ('columnName' in publishedAtAttr && publishedAtAttr.columnName) || 'published_at';

  // Create a Knex subquery that selects document IDs with published entries
  const knex = strapi.db.connection;
  const subquery = knex(tableName).distinct(documentIdColumn).whereNotNull(publishedAtColumn);

  if (hasPublishedVersion) {
    // documentId IN (SELECT document_id FROM table WHERE published_at IS NOT NULL)
    return assoc(['lookup', 'documentId'], { $in: subquery }, params);
  }

  // documentId NOT IN (SELECT document_id FROM table WHERE published_at IS NOT NULL)
  return assoc(['lookup', 'documentId'], { $notIn: subquery }, params);
};

const setStatusToDraftCurry = curry(setStatusToDraft);
const defaultToDraftCurry = curry(defaultToDraft);
const defaultStatusCurry = curry(defaultStatus);
const filterDataPublishedAtCurry = curry(filterDataPublishedAt);
const statusToLookupCurry = curry(statusToLookup);
const statusToDataCurry = curry(statusToData);
const hasPublishedVersionToLookupCurry = curry(hasPublishedVersionToLookup);

export {
  setStatusToDraftCurry as setStatusToDraft,
  defaultToDraftCurry as defaultToDraft,
  defaultStatusCurry as defaultStatus,
  filterDataPublishedAtCurry as filterDataPublishedAt,
  statusToLookupCurry as statusToLookup,
  statusToDataCurry as statusToData,
  hasPublishedVersionToLookupCurry as hasPublishedVersionToLookup,
};
