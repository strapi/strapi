import { Documents } from '@strapi/types';

type Middleware = Documents.Middleware.Middleware<any, any>;

/**
 * Sets status to draft only
 */
export const setStatusToDraft: Middleware = async (ctx, next) => {
  if (!ctx.params) ctx.params = {};

  ctx.params.status = 'draft';

  return next(ctx);
};

/**
 * Adds a default status of `draft` to the params
 */
export const defaultToDraft: Middleware = async (ctx, next) => {
  if (!ctx.params) ctx.params = {};

  // Default to draft if no status is provided or it's invalid
  if (!ctx.params.status || ctx.params.status !== 'published') {
    ctx.params.status = 'draft';
  }

  return next(ctx);
};

/**
 * Add status lookup query to the params
 */
export const statusToLookup: Middleware = async (ctx, next) => {
  if (!ctx.params) ctx.params = {};

  const lookup = ctx.params.lookup || {};

  switch (ctx.params?.status) {
    case 'published':
      lookup.publishedAt = { $notNull: true };
      break;
    case 'draft':
      lookup.publishedAt = { $null: true };
      break;
    default:
      break;
  }

  ctx.params.lookup = lookup;

  return next(ctx);
};

/**
 * Translate publication status parameter into the data that will be saved
 */
export const statusToData: Middleware = async (ctx, next) => {
  if (!ctx.params) ctx.params = {};

  // Ignore publishedAt attribute. TODO: Make publishedAt not editable
  const { publishedAt, ...data } = ctx.params.data || {};

  switch (ctx.params?.status) {
    case 'published':
      data.publishedAt = new Date();
      break;
    case 'draft':
      data.publishedAt = null;
      break;
    default:
      break;
  }

  ctx.params.data = data;

  return next(ctx);
};

export default {
  setStatusToDraft,
  defaultToDraft,
  statusToLookup,
  statusToData,
};
