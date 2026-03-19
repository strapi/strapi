import { assoc, curry } from 'lodash/fp';

import type { Modules, Struct, UID } from '@strapi/types';
import { contentTypes, errors } from '@strapi/utils';

type ParamsTransform = (params: Modules.Documents.Params.All) => Modules.Documents.Params.All;

type TransformWithContentType = (
  contentType: Struct.SingleTypeSchema | Struct.CollectionTypeSchema,
  params: Modules.Documents.Params.All
) => Modules.Documents.Params.All;

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
 * Synchronous helper that returns the "has published version" condition for a given model.
 * Returns the documentId subquery condition, or null if the model doesn't use draft & publish.
 *
 * This is used by the filters function in transform/query.ts so that the condition
 * is applied to both root and nested (populate) queries.
 */
const getHasPublishedVersionCondition = (
  uid: UID.Schema,
  hasPublishedVersion: boolean
): Record<string, any> | null => {
  const model = strapi.getModel(uid);

  // Ignore if target model has disabled DP or doesn't exist (e.g., components)
  if (!model || !contentTypes.hasDraftAndPublish(model)) {
    return null;
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
    return { documentId: { $in: subquery } };
  }

  return { documentId: { $notIn: subquery } };
};

const setStatusToDraftCurry = curry(setStatusToDraft);
const defaultToDraftCurry = curry(defaultToDraft);
const defaultStatusCurry = curry(defaultStatus);
const filterDataPublishedAtCurry = curry(filterDataPublishedAt);
const statusToLookupCurry = curry(statusToLookup);
const statusToDataCurry = curry(statusToData);

export {
  setStatusToDraftCurry as setStatusToDraft,
  defaultToDraftCurry as defaultToDraft,
  defaultStatusCurry as defaultStatus,
  filterDataPublishedAtCurry as filterDataPublishedAt,
  statusToLookupCurry as statusToLookup,
  statusToDataCurry as statusToData,
  parseHasPublishedVersion,
  getHasPublishedVersionCondition,
};
