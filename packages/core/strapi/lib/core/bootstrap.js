'use strict';

const _ = require('lodash');
const { getConfigUrls, contentTypes: contentTypesUtils } = require('strapi-utils');

const { createCoreApi } = require('../core-api');

module.exports = function(strapi) {
  // Set connections.
  strapi.connections = {};

  const defaultConnection = strapi.config.get('database.defaultConnection');

  // Set current connections.
  strapi.config.connections = strapi.config.get('database.connections', {});

  strapi.contentTypes = {};

  // Set models.
  strapi.models = Object.keys(strapi.api || []).reduce((acc, apiName) => {
    const api = strapi.api[apiName];

    for (let modelName in api.models) {
      let model = strapi.api[apiName].models[modelName];

      // mutate model
      contentTypesUtils.createContentType(model, { modelName, defaultConnection }, { apiName });

      strapi.contentTypes[model.uid] = model;

      const { service, controller } = createCoreApi({ model, api, strapi });

      _.set(strapi.api[apiName], ['services', modelName], service);
      _.set(strapi.api[apiName], ['controllers', modelName], controller);

      acc[modelName] = model;
    }
    return acc;
  }, {});

  // Set components
  Object.keys(strapi.components).forEach(componentName => {
    const component = strapi.components[componentName];
    component.connection = component.connection || defaultConnection;
  });

  // Set controllers.
  strapi.controllers = Object.keys(strapi.api || []).reduce((acc, key) => {
    for (let index in strapi.api[key].controllers) {
      let controller = strapi.api[key].controllers[index];
      controller.identity = controller.identity || _.upperFirst(index);
      acc[index] = controller;
    }

    return acc;
  }, {});

  // Set services.
  strapi.services = Object.keys(strapi.api || []).reduce((acc, key) => {
    for (let index in strapi.api[key].services) {
      acc[index] = strapi.api[key].services[index];
    }

    return acc;
  }, {});

  // Set routes.
  strapi.config.routes = Object.keys(strapi.api || []).reduce((acc, key) => {
    return acc.concat(_.get(strapi.api[key], 'config.routes') || {});
  }, []);

  // Init admin controllers.
  Object.keys(strapi.admin.controllers || []).forEach(key => {
    if (!strapi.admin.controllers[key].identity) {
      strapi.admin.controllers[key].identity = key;
    }
  });

  // Init admin models.
  Object.keys(strapi.admin.models || []).forEach(modelName => {
    let model = strapi.admin.models[modelName];

    // mutate model
    contentTypesUtils.createContentType(model, { modelName, defaultConnection });

    strapi.contentTypes[model.uid] = model;
  });

  Object.keys(strapi.plugins).forEach(pluginName => {
    let plugin = strapi.plugins[pluginName];
    Object.assign(plugin, {
      controllers: plugin.controllers || [],
      services: plugin.services || [],
      models: plugin.models || [],
    });

    Object.keys(plugin.controllers).forEach(key => {
      let controller = plugin.controllers[key];

      Object.assign(controller, {
        identity: controller.identity || key,
      });
    });

    Object.keys(plugin.models || []).forEach(modelName => {
      let model = plugin.models[modelName];

      // mutate model
      contentTypesUtils.createContentType(model, { modelName, defaultConnection }, { pluginName });

      strapi.contentTypes[model.uid] = model;
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
    strapi.config.serveAdminPanel
  );

  if (!shouldServeAdmin) {
    strapi.config.serveAdminPanel = false;
  }
};
