'use strict';

const _ = require('lodash');

const validateLocaleCreation = require('./controllers/validate-locale-creation');
const { getService } = require('./utils');

const enableContentType = require('./migrations/content-type/enable');
const disableContentType = require('./migrations/content-type/disable');

module.exports = ({ strapi }) => {
  extendLocalizedContentTypes(strapi);
  addContentManagerLocaleMiddleware(strapi);
  addContentTypeSyncHooks(strapi);
};

/**
 * Adds middleware on CM creation routes to use i18n locale passed in a specific param
 * @param {Strapi} strapi
 */
const addContentManagerLocaleMiddleware = (strapi) => {
  strapi.server.router.use('/content-manager/collection-types/:model', (ctx, next) => {
    if (ctx.method === 'POST') {
      return validateLocaleCreation(ctx, next);
    }

    return next();
  });

  strapi.server.router.use('/content-manager/single-types/:model', (ctx, next) => {
    if (ctx.method === 'PUT') {
      return validateLocaleCreation(ctx, next);
    }

    return next();
  });
};

/**
 * Adds hooks to migration content types locales on enable/disable of I18N
 * @param {Strapi} strapi
 */
const addContentTypeSyncHooks = (strapi) => {
  strapi.hook('strapi::content-types.beforeSync').register(disableContentType);
  strapi.hook('strapi::content-types.afterSync').register(enableContentType);
};

/**
 * Adds locale and localization fields to localized content types
 * @param {Strapi} strapi
 */
const extendLocalizedContentTypes = (strapi) => {
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
    require('./graphql')({ strapi }).register();
  }
};
