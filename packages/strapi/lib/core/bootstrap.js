'use strict';

const _ = require('lodash');

const { createCoreApi } = require('../core-api');
const getURLFromSegments = require('../utils/url-from-segments');

const getKind = obj => obj.kind || 'collectionType';

const pickSchema = model => {
  const schema = _.cloneDeep(
    _.pick(model, ['connection', 'collectionName', 'info', 'options', 'attributes'])
  );

  schema.kind = getKind(model);
  return schema;
};

module.exports = function(strapi) {
  // Retrieve Strapi version.
  strapi.config.uuid = _.get(strapi.config.info, 'strapi.uuid', '');
  strapi.config.info.strapi = require(__dirname + '/../../package.json').version;

  // Set connections.
  strapi.connections = {};

  const defaultConnection = strapi.config.database.defaultConnection;

  // Set current connections.
  strapi.config.connections = _.get(strapi.config, 'database.connections', {});

  if (_.get(strapi.config, 'language.enabled')) {
    strapi.config.language.locales = Object.keys(_.get(strapi.config, 'locales', {}));
  }

  strapi.contentTypes = {};

  // Set models.
  strapi.models = Object.keys(strapi.api || []).reduce((acc, apiName) => {
    const api = strapi.api[apiName];

    for (let modelName in api.models) {
      let model = strapi.api[apiName].models[modelName];

      Object.assign(model, {
        __schema__: pickSchema(model),
        kind: getKind(model),
        modelType: 'contentType',
        uid: `application::${apiName}.${modelName}`,
        apiName,
        modelName,
        globalId: model.globalId || _.upperFirst(_.camelCase(modelName)),
        collectionName: model.collectionName || `${modelName}`.toLocaleLowerCase(),
        connection: model.connection || defaultConnection,
      });

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
  Object.keys(strapi.admin.models || []).forEach(key => {
    let model = strapi.admin.models[key];

    Object.assign(model, {
      __schema__: pickSchema(model),
      modelType: 'contentType',
      kind: getKind(model),
      uid: `strapi::${key}`,
      plugin: 'admin',
      modelName: key,
      identity: model.identity || _.upperFirst(key),
      globalId: model.globalId || _.upperFirst(_.camelCase(`admin-${key}`)),
      connection: model.connection || defaultConnection,
    });

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

    Object.keys(plugin.models || []).forEach(key => {
      let model = plugin.models[key];

      Object.assign(model, {
        __schema__: pickSchema(model),
        modelType: 'contentType',
        kind: getKind(model),
        modelName: key,
        uid: `plugins::${pluginName}.${key}`,
        plugin: pluginName,
        collectionName: model.collectionName || `${pluginName}_${key}`.toLowerCase(),
        globalId: model.globalId || _.upperFirst(_.camelCase(`${pluginName}-${key}`)),
        connection: model.connection || defaultConnection,
      });

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
  const port = strapi.config.get('server.port');
  const host = strapi.config.get('server.host');

  let hostname = host;
  if (strapi.config.environment === 'development' && ['127.0.0.1', '0.0.0.0'].includes(host)) {
    hostname = 'localhost';
  }

  // proxy settings
  const proxy = strapi.config.get('server.proxy', {});

  // check if proxy is enabled and construct url
  strapi.config.url = proxy.enabled
    ? getURLFromSegments({
        hostname: proxy.host,
        port: proxy.port,
        ssl: proxy.ssl,
      })
    : getURLFromSegments({
        hostname,
        port,
      });

  const adminPath = strapi.config.get('server.admin.path', 'admin');

  // check if we should serve admin panel
  const shouldServeAdmin = strapi.config.get(
    'server.admin.serveAdminPanel',
    strapi.config.serveAdminPanel
  );

  if (!shouldServeAdmin) {
    strapi.config.serveAdminPanel = false;
  }

  strapi.config.admin.url = new URL(adminPath, strapi.config.url).toString();
};
