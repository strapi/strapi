'use strict';

const _ = require('lodash');
const { toLower, kebabCase } = require('lodash/fp');
const { getConfigUrls } = require('@strapi/utils');
const pluralize = require('pluralize');

const { createCoreApi } = require('../core-api');

// TODO: function to be moved next to where the api will be loaded
const validateContentTypesUnicity = schemas => {
  const names = [];
  schemas.forEach(schema => {
    if (schema.info.singularName) {
      const singularName = kebabCase(schema.info.singularName);
      if (names.includes(singularName)) {
        throw new Error(`The singular name "${schema.info.singularName}" should be unique`);
      }
      names.push(singularName);
    }
    if (schema.info.pluralName) {
      const pluralName = kebabCase(schema.info.pluralName);
      if (names.includes(pluralName)) {
        throw new Error(`The plural name "${schema.info.pluralName}" should be unique`);
      }
      names.push(pluralName);
    }
  });
};

module.exports = function(strapi) {
  // validate Content-Types unicity
  const allApisSchemas = Object.values(strapi.api).flatMap(api => Object.values(api.models));
  validateContentTypesUnicity(allApisSchemas);

  // add user's content-types, controller and services
  for (const apiName in strapi.api) {
    const api = strapi.api[apiName];
    _.defaultsDeep(api, { config: { routes: [] } }); // TODO: remove V4
    for (const modelName in api.models) {
      const model = api.models[modelName];
      model.info.displayName = model.info.displayName || model.info.name;
      model.info.singularName = model.info.singularName || modelName;
      model.info.pluralName = model.info.pluralName || pluralize(modelName);

      strapi.container.get('content-types').add(`api::${apiName}`, {
        [modelName]: { schema: model, actions: model.actions, lifecycles: model.lifecycles },
      });
      const contentType = strapi.contentType(`api::${apiName}.${modelName}`);

      const { service, controller } = createCoreApi({ model: contentType, api, strapi });
      // TODO: remove V4
      _.set(strapi.api[apiName], ['services', modelName], service);
      _.set(strapi.api[apiName], ['controllers', modelName], controller);

      strapi.container.get('controllers').add(`api::${apiName}`, { [modelName]: controller });
      strapi.container.get('services').add(`api::${apiName}`, { [modelName]: service });
    }
  }

  // TODO: delete v3 code
  _.forEach(strapi.plugins, plugin => {
    _.forEach(plugin.middlewares, (middleware, middlewareUID) => {
      const middlewareName = toLower(middlewareUID.split('.')[1]);
      strapi.middleware[middlewareName] = middleware;
    });
  });

  // Preset config in alphabetical order.
  strapi.config.middleware.settings = Object.keys(strapi.middleware).reduce((acc, current) => {
    // Try to find the settings in the current environment, then in the main configurations.
    const currentSettings = _.merge(
      _.cloneDeep(_.get(strapi.middleware[current], ['defaults', current], {})),
      strapi.config.get(['middleware', 'settings', current], {})
    );

    acc[current] = !_.isObject(currentSettings) ? {} : currentSettings;

    // Ensure that enabled key exist by forcing to false.
    _.defaults(acc[current], { enabled: false });

    return acc;
  }, {});

  // default settings
  strapi.config.port = strapi.config.get('server.port') || strapi.config.port;
  strapi.config.host = strapi.config.get('server.host') || strapi.config.host;

  const { serverUrl, adminUrl, adminPath } = getConfigUrls(strapi.config.get('server'));

  strapi.config.server = strapi.config.server || {};
  strapi.config.server.url = serverUrl;
  strapi.config.admin.url = adminUrl;
  strapi.config.admin.path = adminPath;

  // check if we should serve admin panel
  const shouldServeAdmin = strapi.config.get(
    'server.admin.serveAdminPanel',
    strapi.config.get('serveAdminPanel')
  );

  if (!shouldServeAdmin) {
    strapi.config.serveAdminPanel = false;
  }
};
