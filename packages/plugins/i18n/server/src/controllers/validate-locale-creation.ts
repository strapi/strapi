import { get } from 'lodash/fp';
import { errors } from '@strapi/utils';
import type { Core, Struct } from '@strapi/types';
import { getService } from '../utils';

const { ApplicationError } = errors;

// TODO: v5 if implemented in the CM => delete this middleware
const validateLocaleCreation: Core.MiddlewareHandler = async (ctx, next) => {
  const { model } = ctx.params;
  const { query } = ctx.request;

  // Prevent empty body
  if (!ctx.request.body) {
    ctx.request.body = {};
  }

  const body = ctx.request.body as any;

  const { getValidLocale, isLocalizedContentType } = getService('content-types');

  const modelDef = strapi.getModel(model) as Struct.ContentTypeSchema;

  if (!isLocalizedContentType(modelDef)) {
    return next();
  }

  // Prevent empty string locale
  const locale = get('locale', query) || get('locale', body) || undefined;

  // cleanup to avoid creating duplicates in single types
  ctx.request.query = {};

  let entityLocale;
  try {
    entityLocale = await getValidLocale(locale);
  } catch (e) {
    throw new ApplicationError("This locale doesn't exist");
  }

  body.locale = entityLocale;

  if (modelDef.kind === 'singleType') {
    const entity = await strapi.entityService.findMany(modelDef.uid, {
      locale: entityLocale,
    } as any); // TODO: add this type to entityService

    ctx.request.query.locale = body.locale;

    // updating
    if (entity) {
      return next();
    }
  }

  return next();
};

export default validateLocaleCreation;
