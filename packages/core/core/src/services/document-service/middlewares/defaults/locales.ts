// TODO: Move to i18n
import { Documents, Common } from '@strapi/types';

type Middleware = Documents.Middleware.Middleware<any, any>;

const isLocalizedContentType = (uid: Common.UID.Schema) => {
  const model = strapi.getModel(uid);
  return strapi.plugin('i18n').service('content-types').isLocalizedContentType(model);
};

export const defaultLocale: Middleware = async (ctx, next) => {
  if (!isLocalizedContentType(ctx.uid)) return next(ctx);
  if (!ctx.params) ctx.params = {};

  if (!ctx.params.locale) {
    // Default to en (TODO: Load default locale from db in i18n)
    ctx.params.locale = 'en';
  }

  return next(ctx);
};

/**
 * Add locale lookup query to the params
 */
export const localeToLookup: Middleware = async (ctx, next) => {
  if (!isLocalizedContentType(ctx.uid)) return next(ctx);
  if (!ctx.params) ctx.params = {};

  const lookup = ctx.params.lookup || {};

  if (ctx.params.locale) {
    lookup.locale = ctx.params.locale;
    ctx.params.lookup = lookup;
  }

  return next(ctx);
};

/**
 * Translate locale status parameter into the data that will be saved
 */
export const localeToData: Middleware = async (ctx, next) => {
  if (!isLocalizedContentType(ctx.uid)) {
    // Remove data.locale if it is not a localized content type
    if (ctx.params?.data?.locale) {
      ctx.params.data.locale = null;
    }

    return next(ctx);
  }
  if (!ctx.params) ctx.params = {};

  const data = ctx.params.data || {};

  if (ctx.params.locale) {
    data.locale = ctx.params.locale;
  }

  ctx.params.data = data;

  return next(ctx);
};

export default {
  defaultLocale,
  localeToLookup,
  localeToData,
};
