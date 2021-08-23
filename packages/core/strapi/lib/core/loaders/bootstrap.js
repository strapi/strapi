'use strict';

const _ = require('lodash');
const { toLower, kebabCase } = require('lodash/fp');
const { getConfigUrls } = require('@strapi/utils');
const pluralize = require('pluralize');
const { createContentType } = require('../domain/content-type');

const { createCoreApi } = require('../../core-api');

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
  strapi.contentTypes = {};

  // validate Content-Types unicity
  const allApisSchemas = Object.values(strapi.api).flatMap(api => Object.values(api.models));
  validateContentTypesUnicity(allApisSchemas);

  // TODO: to change with new loading system
  // Register api content types
  for (const apiName in strapi.api) {
    const api = strapi.api[apiName];

    const v4ContentTypes = _.mapValues(api.models, (model, modelName) => {
      model.info.displayName = model.info.displayName || model.info.name;
      model.info.singularName = model.info.singularName || modelName;
      model.info.pluralName = model.info.pluralName || pluralize(modelName);

      return {
        schema: model,
        actions: {},
        lifecycles: {},
      };
    });

    strapi.container.get('content-types').add(`api::${apiName}`, v4ContentTypes);
  }

  // TODO: remove v3
  // Set models.
  strapi.models = {};
  for (const apiName in strapi.api) {
    const api = strapi.api[apiName];
    for (let modelName in api.models) {
      let model = api.models[modelName];
      const contentType = strapi.container
        .get('content-types')
        .get(`api::${apiName}.${model.info.singularName}`);
      Object.assign(model, contentType.schema);
      strapi.contentTypes[model.uid] = contentType.schema;

      strapi.models[modelName] = model;
    }
  }

  // set default services and default controllers
  for (const apiName in strapi.api) {
    const api = strapi.api[apiName];
    for (const modelName in api.models) {
      const model = api.models[modelName];
      const { service, controller } = createCoreApi({ model, api, strapi });
      _.set(strapi.api[apiName], ['services', modelName], service);
      _.set(strapi.api[apiName], ['controllers', modelName], controller);
    }
  }

  // Set user's controllers.
  strapi.controllers = Object.keys(strapi.api || []).reduce((acc, apiName) => {
    strapi.container.get('controllers').add(`api::${apiName}`, strapi.api[apiName].controllers);
    for (let controllerName in strapi.api[apiName].controllers) {
      let controller = strapi.api[apiName].controllers[controllerName];
      acc[controllerName] = controller;
    }

    return acc;
  }, {});

  // Set user's services.
  strapi.services = Object.keys(strapi.api || []).reduce((acc, apiName) => {
    strapi.container.get('services').add(`api::${apiName}`, strapi.api[apiName].services);
    for (let serviceName in strapi.api[apiName].services) {
      acc[serviceName] = strapi.api[apiName].services[serviceName];
    }

    return acc;
  }, {});

  // Set routes.
  strapi.config.routes = Object.keys(strapi.api || []).reduce((acc, key) => {
    return acc.concat(_.get(strapi.api[key], 'config.routes') || {});
  }, []);

  // Init admin models.
  Object.keys(strapi.admin.models || []).forEach(modelName => {
    let model = strapi.admin.models[modelName];
    // mutate model
    const ct = { schema: model, actions: {}, lifecycles: {} };
    ct.schema.info.displayName = model.info.name;
    ct.schema.info.singularName = modelName;
    ct.schema.info.pluralName = pluralize(modelName);

    const createdContentType = createContentType(`strapi::${ct.schema.info.singularName}`, ct);

    Object.assign(model, createdContentType.schema);
    strapi.contentTypes[model.uid] = model;
  });

  // TODO: delete v3 code
  _.forEach(strapi.plugins, plugin => {
    _.forEach(plugin.contentTypes, (ct, ctUID) => {
      strapi.contentTypes[ctUID] = ct.schema;
    });

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
