import { get } from 'lodash/fp';
import { errors } from '@strapi/utils';
import type { Common, Schema } from '@strapi/types';
import { getService } from '../utils';

const { ApplicationError } = errors;

const validateLocaleCreation: Common.MiddlewareHandler = async (ctx, next) => {
  const { model } = ctx.params;
  const { query } = ctx.request;
  const body = ctx.request.body as any;

  const {
    getValidLocale,

    isLocalizedContentType,

    // fillNonLocalizedAttributes,
  } = getService('content-types');

  const modelDef = strapi.getModel(model) as Schema.ContentType;

  if (!isLocalizedContentType(modelDef)) {
    return next();
  }

  // Prevent empty string locale
  const locale = get('locale', query) || get('locale', body) || undefined;

  // TODO:
  // const relatedEntityId = get('plugins.i18n.relatedEntityId', query);
  // cleanup to avoid creating duplicates in singletypes
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

  // TODO V5 - non localized attributes
  // fillNonLocalizedAttributes(body, relatedEntity, { model });

  return next();
};

export default validateLocaleCreation;
