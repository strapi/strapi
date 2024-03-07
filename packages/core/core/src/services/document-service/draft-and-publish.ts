import { assoc, curry } from 'lodash/fp';

import { Schema, Documents } from '@strapi/types';
import { contentTypes } from '@strapi/utils';

type Transform = (params: Documents.Params.All) => Documents.Params.All;
type ContentTypeTransform = (
  contentType: Schema.ContentType,
  params: Documents.Params.All
) => Documents.Params.All;

/**
 * Set status to the default value:
 *  DP Enabled  -> draft
 *  DP Disabled -> published
 */
const setStatusToDefault: ContentTypeTransform = (contentType, params) => {
  const hasDraftAndPublish = contentTypes.hasDraftAndPublish(contentType);
  const status = hasDraftAndPublish ? 'draft' : 'published';

  return assoc('status', status, params);
};

/**
 *  DP Enabled  -> If status is not provided, set it to draft
 *  DP Disabled -> Set status to published
 */
const defaultStatus: ContentTypeTransform = (contentType, params) => {
  if (!contentTypes.hasDraftAndPublish(contentType)) {
    return assoc('status', 'published', params);
  }

  // Default to draft if no status is provided or it's invalid
  if (!params.status || params.status !== 'published') {
    return assoc('status', 'draft', params);
  }

  return params;
};

/**
 * In mutating actions we don't want user to set the publishedAt attribute.
 */
const filterDataPublishedAt: Transform = (params) => {
  if (params?.data?.publishedAt) {
    return assoc(['data', 'publishedAt'], null, params);
  }

  return params;
};

/**
 * Add status lookup query to the params
 */
const statusToLookup: Transform = (params) => {
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
const statusToData: Transform = (params) => {
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

const setStatusToDefaultCurry = curry(setStatusToDefault);
const defaultStatusCurry = curry(defaultStatus);
const filterDataPublishedAtCurry = curry(filterDataPublishedAt);
const statusToLookupCurry = curry(statusToLookup);
const statusToDataCurry = curry(statusToData);

export {
  setStatusToDefaultCurry as setStatusToDefault,
  defaultStatusCurry as defaultStatus,
  filterDataPublishedAtCurry as filterDataPublishedAt,
  statusToLookupCurry as statusToLookup,
  statusToDataCurry as statusToData,
};
