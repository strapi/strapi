'use strict';

const { set } = require('lodash');
const { getContentTypeRoutePrefix } = require('strapi-utils').contentTypes;

/**
 * Returns a handler to handle localizations creation in the core api
 * @param {object} contentType
 * @returns ((oject) => {})
 */
const createLocalizationHandler = contentType => {
  return function(ctx) {
    ctx.body = 'works';
  };
};

/**
 * Returns a route config to handle localizations creation in the core api
 * @param {object} contentType
 * @returns {{ method: string, path: string, handler: string, config: { policies: string[] }}}
 */
const createLocalizationRoute = contentType => {
  const { modelName } = contentType;

  return {
    method: 'POST',
    path: `/${getContentTypeRoutePrefix(contentType)}/:id/localizations`,
    handler: `${modelName}.createLocalization`,
    config: {
      policies: [],
    },
  };
};

/**
 * Adds a route & an action to the core api controller of a content type to allow creating new localizations
 * @param {object} contentType
 */
const addCreateLocalizationAction = contentType => {
  const { modelName, apiName } = contentType;

  const localizationRoute = createLocalizationRoute(contentType);

  const coreApiControllerPath = `api.${apiName}.controllers.${modelName}.createLocalization`;
  const handler = createLocalizationHandler(contentType);

  strapi.config.routes.push(localizationRoute);

  set(strapi, coreApiControllerPath, handler);
};

module.exports = {
  addCreateLocalizationAction,
};
