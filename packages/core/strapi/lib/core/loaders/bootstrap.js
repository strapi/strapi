'use strict';

const _ = require('lodash');
const { toLower } = require('lodash/fp');
const { getConfigUrls } = require('@strapi/utils');
const { createContentType } = require('../domain/content-type');

const { createCoreApi } = require('../../core-api');

module.exports = function(strapi) {
  strapi.contentTypes = {};

  // Set models.
  strapi.models = Object.keys(strapi.api || []).reduce((acc, apiName) => {
    const api = strapi.api[apiName];

    for (let modelName in api.models) {
      let model = strapi.api[apiName].models[modelName];

      // mutate model
      const ct = {
        schema: model,
        actions: {},
        lifecycles: {},
      };
      ct.schema.info = {};
      ct.schema.info.displayName = _.camelCase(modelName);
      ct.schema.info.singularName = _.camelCase(modelName);
      ct.schema.info.pluralName = `${_.camelCase(modelName)}s`;

      const createdContentType = createContentType(
        `api::${apiName}.${ct.schema.info.singularName}`,
        ct
      );
      Object.assign(model, createdContentType.schema);
      strapi.contentTypes[model.uid] = model;

      const { service, controller } = createCoreApi({ model, api, strapi });

      _.set(strapi.api[apiName], ['services', modelName], service);
      _.set(strapi.api[apiName], ['controllers', modelName], controller);

      acc[modelName] = model;
    }
    return acc;
  }, {});

  // Set controllers.
  strapi.controllers = Object.keys(strapi.api || []).reduce((acc, apiName) => {
    strapi.container.get('controllers').add(`api::${apiName}`, strapi.api[apiName].controllers);
    for (let controllerName in strapi.api[apiName].controllers) {
      let controller = strapi.api[apiName].controllers[controllerName];
      acc[controllerName] = controller;
    }

    return acc;
  }, {});

  // Set services.
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
    ct.schema.info = {};
    ct.schema.info.displayName = _.camelCase(modelName);
    ct.schema.info.singularName = _.camelCase(modelName);
    ct.schema.info.pluralName = `${_.camelCase(modelName)}s`;

    const createdContentType = createContentType(`strapi::${ct.schema.info.singularName}`, ct);

    Object.assign(model, createdContentType.schema);
    strapi.contentTypes[model.uid] = model;
  });

  // TODO: delete v3 code
  _.forEach(strapi.pluginsV4, (plugin, pluginUID) => {
    const pluginName = pluginUID.split('::')[1];
    strapi.plugins[pluginName] = {
      models: {},
      config: { policies: {} },
      services: {},
      middlewares: {},
      controllers: {},
      routes: plugin.routes,
    };

    _.forEach(plugin.contentTypes, (ct, ctUID) => {
      strapi.contentTypes[ctUID] = ct.schema;
      strapi.plugins[pluginName][ct.schema.modelName] = ct.schema;
      strapi.plugins[pluginName].models[ct.schema.modelName] = ct.schema;
    });

    _.forEach(plugin.policies, (policy, policyUID) => {
      const policyName = toLower(policyUID.split('.')[1]);
      strapi.plugins[pluginName].config.policies[policyName] = policy;
    });

    _.forEach(plugin.services, (service, serviceUID) => {
      const serviceName = toLower(serviceUID.split('.')[1]);
      strapi.plugins[pluginName].services[serviceName] = service;
    });

    _.forEach(plugin.middlewares, (middleware, middlewareUID) => {
      const middlewareName = toLower(middlewareUID.split('.')[1]);
      strapi.plugins[pluginName].middlewares[middlewareName] = middleware;
    });

    _.forEach(plugin.controllers, (controller, controllerUID) => {
      const controllerName = toLower(controllerUID.split('.')[1]);
      strapi.plugins[pluginName].controllers[controllerName] = controller;
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

  strapi.config.hook.settings = Object.keys(strapi.hook).reduce((acc, current) => {
    // Try to find the settings in the current environment, then in the main configurations.
    const currentSettings = _.merge(
      _.cloneDeep(_.get(strapi.hook[current], ['defaults', current], {})),
      strapi.config.get(['hook', 'settings', current], {})
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
