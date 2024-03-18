import { assoc, curry } from 'lodash/fp';

import { Modules, Struct } from '@strapi/types';
import { contentTypes } from '@strapi/utils';

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
};
