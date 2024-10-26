import { get } from 'lodash/fp';
import { errors } from '@strapi/utils';
import type { Core, Struct } from '@strapi/types';
import { getService } from '../utils';

const { ApplicationError } = errors;

interface RequestBody {
  locale?: string;
  [key: string]: any;
}

// TODO: v5 if implemented in the CM => delete this middleware
const validateLocaleCreation: Core.MiddlewareHandler = async (ctx, next) => {
  const { model } = ctx.params;
  const { query } = ctx.request;

  // Initialize body with type safety
  if (!ctx.request.body) {
    ctx.request.body = {};
  }
  const body = ctx.request.body as RequestBody;

  const { getValidLocale, isLocalizedContentType } = getService('content-types');
  const modelDef = strapi.getModel(model) as Struct.ContentTypeSchema;

  if (!isLocalizedContentType(modelDef)) {
    return next();
  }

  // Get locale with proper type checking
  const locale = get('locale', query) || get('locale', body) || undefined;

  // cleanup to avoid creating duplicates in single types
  ctx.request.query = {};

  try {
    const entityLocale = await getValidLocale(locale);
    body.locale = entityLocale;

    if (modelDef.kind === 'singleType') {
      const entity = await strapi.entityService.findMany(modelDef.uid, {
        locale: entityLocale,
      });

      ctx.request.query.locale = entityLocale;

      // updating
      if (entity) {
        return next();
      }
    }

    return next();
  } catch (e) {
    throw new ApplicationError('Invalid locale provided', {
      details: { locale },
    });
  }
};

export default validateLocaleCreation;
