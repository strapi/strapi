import { assoc, curry } from 'lodash/fp';

import { Schema, Documents } from '@strapi/types';
import { contentTypes } from '@strapi/utils';

type Transform = (
  contentType: Schema.SingleType | Schema.CollectionType,
  params: Documents.Params.All
) => Documents.Params.All;

/**
 * Sets status to draft only
 */
const setStatusToDraft: Transform = (contentType, params) => {
  if (!contentTypes.hasDraftAndPublish(contentType)) {
    return params;
  }

  return assoc('status', 'draft', params);
};

/**
 * Adds a default status of `draft` to the params
 */
const defaultToDraft: Transform = (contentType, params) => {
  if (!contentTypes.hasDraftAndPublish(contentType)) {
    return params;
  }

  // Default to draft if no status is provided or it's invalid
  if (!params.status || params.status !== 'published') {
    return setStatusToDraft(contentType, params);
  }

  return params;
};

/**
 * In mutating actions we don't want user to set the publishedAt attribute.
 */
const filterDataPublishedAt: Transform = (contentType, params) => {
  if (!contentTypes.hasDraftAndPublish(contentType)) {
    return params;
  }

  if (params?.data?.publishedAt) {
    return assoc(['data', 'publishedAt'], null, params);
  }

  return params;
};

/**
 * Add status lookup query to the params
 */
const statusToLookup: Transform = (contentType, params) => {
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
const statusToData: Transform = (contentType, params) => {
  if (!contentTypes.hasDraftAndPublish(contentType)) {
    // Prevent setting publishedAt attribute
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
const filterDataPublishedAtCurry = curry(filterDataPublishedAt);
const statusToLookupCurry = curry(statusToLookup);
const statusToDataCurry = curry(statusToData);

export {
  setStatusToDraftCurry as setStatusToDraft,
  defaultToDraftCurry as defaultToDraft,
  filterDataPublishedAtCurry as filterDataPublishedAt,
  statusToLookupCurry as statusToLookup,
  statusToDataCurry as statusToData,
};
