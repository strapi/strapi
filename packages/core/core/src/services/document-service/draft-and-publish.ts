import { Documents } from '@strapi/types';
import { assoc } from 'lodash/fp';

type ParamsTransform = (params: Documents.Params.All) => Documents.Params.All;

/**
 * Sets status to draft only
 */
export const setStatusToDraft: ParamsTransform = assoc('status', 'draft');

/**
 * Adds a default status of `draft` to the params
 */
export const defaultToDraft: ParamsTransform = (params) => {
  // Default to draft if no status is provided or it's invalid
  if (!params.status || params.status !== 'published') {
    return setStatusToDraft(params);
  }

  return params;
};

/**
 * In mutating actions we don't want user to set the publishedAt attribute.
 */
export const filterDataPublishedAt: ParamsTransform = (params) => {
  if (params?.data?.publishedAt) {
    return assoc(['data', 'publishedAt'], null, params);
  }

  return params;
};

/**
 * Add status lookup query to the params
 */
export const statusToLookup: ParamsTransform = (params) => {
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
export const statusToData: ParamsTransform = (params) => {
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
