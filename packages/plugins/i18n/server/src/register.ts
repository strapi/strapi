import _ from 'lodash';
import type { Strapi } from '@strapi/types';

import validateLocaleCreation from './controllers/validate-locale-creation';
import { getService } from './utils';
import graphqlProvider from './graphql';

import enableContentType from './migrations/content-type/enable';
import disableContentType from './migrations/content-type/disable';

export default ({ strapi }: { strapi: Strapi }) => {
  extendLocalizedContentTypes(strapi);
  addContentManagerLocaleMiddleware(strapi);
  addContentTypeSyncHooks(strapi);
};

/**
 * Match urls for model creation
 *  /content-manager/collection-types/api::category.category/
 *  /content-manager/collection-types/api::category.category
 *
 * And not match:
 *  /content-manager/collection-types/api::category.category/1
 *  /content-manager/collection-types/api::category.category/1/actions/publish
 */
const isUrlForCreation = (url: string) => {
  if (!url) return false;

  // Remove any query params
  // /content-manager/collection-types/api::category.category/?locale=en
  const path = url.split('?')[0];

  // Split path and remove empty strings
  // [ 'content-manager', 'collection-types', 'api::category.category' ]
  const splitUrl = path.split('/').filter(Boolean);

  // Get the last element of the array
  // api::category.category / 1 / publish

  const model = splitUrl[splitUrl.length - 1];

  // If the model contains :: it means it's a uid
  return model.includes('::');
};

/**
 * Adds middleware on CM creation routes to use i18n locale passed in a specific param
 * @param {Strapi} strapi
 */
const addContentManagerLocaleMiddleware = (strapi: Strapi) => {
  strapi.server.router.use('/content-manager/collection-types/:model', (ctx, next) => {
    if (ctx.method === 'POST' && isUrlForCreation(ctx.originalUrl)) {
      return validateLocaleCreation(ctx, next);
    }

    return next();
  });

  strapi.server.router.use('/content-manager/single-types/:model', (ctx, next) => {
    if (ctx.method === 'PUT' && isUrlForCreation(ctx.originalUrl)) {
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
 * Adds locale and localization fields to localized content types
 * @param {Strapi} strapi
 */
const extendLocalizedContentTypes = (strapi: Strapi) => {
  const contentTypeService = getService('content-types');
  const coreApiService = getService('core-api');

  Object.values(strapi.contentTypes).forEach((contentType) => {
    if (contentTypeService.isLocalizedContentType(contentType)) {
      const { attributes } = contentType;

      _.set(attributes, 'localizations', {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: contentType.uid,
      });

      _.set(attributes, 'locale', {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      });

      coreApiService.addCreateLocalizationAction(contentType);
    }
  });

  if (strapi.plugin('graphql')) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    graphqlProvider({ strapi }).register();
  }
};
