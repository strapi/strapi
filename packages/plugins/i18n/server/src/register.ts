import _ from 'lodash';
import type { Strapi } from '@strapi/types';

import validateLocaleCreation from './controllers/validate-locale-creation';
import graphqlProvider from './graphql';

import enableContentType from './migrations/content-type/enable';
import disableContentType from './migrations/content-type/disable';

export default ({ strapi }: { strapi: Strapi }) => {
  extendContentTypes(strapi);
  addContentManagerLocaleMiddleware(strapi);
  addContentTypeSyncHooks(strapi);
};

// TODO: v5 if implemented in the CM => delete this middleware
/**
 * Adds middleware on CM creation routes to use i18n locale passed in a specific param
 * @param {Strapi} strapi
 */
const addContentManagerLocaleMiddleware = (strapi: Strapi) => {
  strapi.server.router.use('/content-manager/collection-types/:model', (ctx, next) => {
    if (ctx.method === 'POST' || ctx.method === 'PUT') {
      return validateLocaleCreation(ctx, next);
    }

    return next();
  });

  strapi.server.router.use('/content-manager/single-types/:model', (ctx, next) => {
    if (ctx.method === 'POST' || ctx.method === 'PUT') {
      return validateLocaleCreation(ctx, next);
    }

    return next();
  });
};

/**
 * Adds hooks to migration content types locales on enable/disable of I18N
 * @param {Strapi} strapi
 */
const addContentTypeSyncHooks = (strapi: Strapi) => {
  strapi.hook('strapi::content-types.beforeSync').register(disableContentType);
  strapi.hook('strapi::content-types.afterSync').register(enableContentType);
};

/**
 * Adds locale and localization fields to all content types
 * Even if content type is not localized, it will have these fields
 * @param {Strapi} strapi
 */
const extendContentTypes = (strapi: Strapi) => {
  Object.values(strapi.contentTypes).forEach((contentType) => {
    const { attributes } = contentType;

    _.set(attributes, 'locale', {
      writable: true,
      private: false,
      configurable: false,
      visible: false,
      type: 'string',
    });
  });

  if (strapi.plugin('graphql')) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    graphqlProvider({ strapi }).register();
  }
};
