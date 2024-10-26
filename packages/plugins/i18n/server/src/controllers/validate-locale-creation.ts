import { get } from 'lodash/fp';
import { errors } from '@strapi/utils';
import type { Context } from 'koa';
import type { Core, Struct } from '@strapi/types';
import { getService } from '../utils';

const { ApplicationError } = errors;

// Define proper types for the request body
interface RequestBody {
  locale?: string;
  [key: string]: any;
}

// Define extended Context type
interface StrapiContext extends Context {
  params: {
    model: string;
  };
  request: {
    body: RequestBody;
    query: {
      locale?: string;
      [key: string]: any;
    };
  };
}

// Declare global strapi object
declare global {
  var strapi: {
    getModel: (model: string) => Struct.ContentTypeSchema;
    entityService: {
      findMany: (uid: string, params: { locale: string }) => Promise<any>;
    };
  };
}

// Service type definitions
interface ContentTypeService {
  getValidLocale: (locale?: string) => Promise<string>;
  isLocalizedContentType: (model: Struct.ContentTypeSchema) => boolean;
}

const validateLocaleCreation: Core.MiddlewareHandler = async (ctx: StrapiContext, next) => {
  const { model } = ctx.params;
  const { query } = ctx.request;

  // Initialize body with type safety
  if (!ctx.request.body) {
    ctx.request.body = {};
  }

  const body = ctx.request.body;

  // Get content-type service with proper typing
  const { getValidLocale, isLocalizedContentType } = getService('content-types') as ContentTypeService;

  const modelDef = strapi.getModel(model);

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
