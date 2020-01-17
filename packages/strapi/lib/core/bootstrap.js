'use strict';

const _ = require('lodash');

const { createController, createService } = require('../core-api');
const getURLFromSegments = require('../utils/url-from-segments');

const getKind = obj => obj.kind || 'collectionType';

const pickSchema = model => {
  const schema = _.cloneDeep(
    _.pick(model, [
      'connection',
      'collectionName',
      'info',
      'options',
      'attributes',
    ])
  );

  schema.kind = getKind(model);
  return schema;
};

module.exports = function(strapi) {
  // Retrieve Strapi version.
  strapi.config.uuid = _.get(strapi.config.info, 'strapi.uuid', '');
  strapi.config.info.customs = _.get(strapi.config.info, 'strapi', {});
  strapi.config.info.strapi = (
    _.get(strapi.config, 'info.dependencies.strapi') || ''
  ).replace(/(\^|~)/g, '');
  strapi.config.info.node = process.versions.node;

  // Set connections.
  strapi.connections = {};

  // Set current environment config.
  strapi.config.currentEnvironment =
    strapi.config.environments[strapi.config.environment] || {};

  const defaultConnection =
    strapi.config.currentEnvironment.database.defaultConnection;

  // Set current connections.
  strapi.config.connections = _.get(
    strapi.config.currentEnvironment,
    'database.connections',
    {}
  );

  if (_.get(strapi.config, 'language.enabled')) {
    strapi.config.language.locales = Object.keys(
      _.get(strapi.config, 'locales', {})
    );
  }

  strapi.contentTypes = {};

  // Set models.
  strapi.models = Object.keys(strapi.api || []).reduce((acc, apiName) => {
    for (let modelName in strapi.api[apiName].models) {
      let model = strapi.api[apiName].models[modelName];

      Object.assign(model, {
        __schema__: pickSchema(model),
        kind: getKind(model),
        modelType: 'contentType',
        uid: `application::${apiName}.${modelName}`,
        apiName,
        modelName,

        globalId: model.globalId || _.upperFirst(_.camelCase(modelName)),
        collectionName:
          model.collectionName || `${modelName}`.toLocaleLowerCase(),
        connection: model.connection || defaultConnection,
      });

      strapi.contentTypes[model.uid] = model;

      // find corresponding service and controller
      const userService = _.get(
        strapi.api[apiName],
        ['services', modelName],
        {}
      );
      const userController = _.get(
        strapi.api[apiName],
        ['controllers', modelName],
        {}
      );

      const service = Object.assign(
        createService({ model: modelName, strapi }),
        userService
      );

      const controller = Object.assign(
        createController({ service, model }),
        userController,
        { identity: userController.identity || _.upperFirst(modelName) }
      );

      _.set(strapi.api[apiName], ['services', modelName], service);
      _.set(strapi.api[apiName], ['controllers', modelName], controller);

      acc[modelName] = model;
    }
    return acc;
  }, {});

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
      connection:
        model.connection ||
        strapi.config.currentEnvironment.database.defaultConnection,
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
        collectionName:
          model.collectionName || `${pluginName}_${key}`.toLowerCase(),
        globalId:
          model.globalId || _.upperFirst(_.camelCase(`${pluginName}-${key}`)),
        connection:
          model.connection ||
          strapi.config.currentEnvironment.database.defaultConnection,
      });

      strapi.contentTypes[model.uid] = model;
    });
  });

  // Define required middlewares categories.
  const middlewareCategories = ['request', 'response', 'security', 'server'];

  // Flatten middlewares configurations.
  const flattenMiddlewaresConfig = middlewareCategories.reduce((acc, index) => {
    const current = _.merge(strapi.config.currentEnvironment[index], {
      public: _.defaults(strapi.config.public, {
        enabled: true,
      }),
      favicon: _.defaults(strapi.config.favicon, {
        enabled: true,
      }),
    });

    if (_.isObject(current)) {
      acc = _.merge(acc, current);
    } else {
      acc[index] = current;
    }

    return acc;
  }, {});

  // These middlewares cannot be disabled.
  _.merge(flattenMiddlewaresConfig, {
    // Necessary middlewares for the core.
    responses: {
      enabled: true,
    },
    router: {
      enabled: true,
    },
    logger: {
      enabled: true,
    },
    boom: {
      enabled: true,
    },
    cors: {
      enabled: true,
    },
    xframe: {
      enabled: true,
    },
    xss: {
      enabled: true,
    },
  });

  // Exclude database and custom.
  middlewareCategories.push('database');

  // Flatten hooks configurations.
  const flattenHooksConfig = _.pullAll(
    Object.keys(strapi.config.currentEnvironment),
    middlewareCategories
  ).reduce((acc, index) => {
    const current = strapi.config.currentEnvironment[index];

    if (_.isObject(current)) {
      acc = _.merge(acc, {
        [index]: current,
      });
    } else {
      acc[index] = current;
    }

    return acc;
  }, {});

  // Enable hooks and dependencies related to the connections.
  for (let name in strapi.config.connections) {
    const connection = strapi.config.connections[name];
    const connector = connection.connector.replace('strapi-hook-', '');

    enableHookNestedDependencies(strapi, connector, flattenHooksConfig);
  }

  // Preset config in alphabetical order.
  strapi.config.middleware.settings = Object.keys(strapi.middleware).reduce(
    (acc, current) => {
      // Try to find the settings in the current environment, then in the main configurations.
      const currentSettings = _.merge(
        _.get(
          _.cloneDeep(strapi.middleware[current]),
          ['defaults', current],
          {}
        ),
        flattenMiddlewaresConfig[current] ||
          strapi.config.currentEnvironment[current] ||
          strapi.config[current]
      );
      acc[current] = !_.isObject(currentSettings) ? {} : currentSettings;

      if (!_.has(acc[current], 'enabled')) {
        strapi.log.warn(
          `(middleware:${current}) wasn't loaded due to missing key \`enabled\` in the configuration`
        );
      }

      // Ensure that enabled key exist by forcing to false.
      _.defaults(acc[current], { enabled: false });

      return acc;
    },
    {}
  );

  strapi.config.hook.settings = Object.keys(strapi.hook).reduce(
    (acc, current) => {
      // Try to find the settings in the current environment, then in the main configurations.
      const currentSettings = _.merge(
        _.get(_.cloneDeep(strapi.hook[current]), ['defaults', current], {}),
        flattenHooksConfig[current] ||
          _.get(strapi.config.currentEnvironment, ['hook', current]) ||
          _.get(strapi.config, ['hook', current])
      );

      acc[current] = !_.isObject(currentSettings) ? {} : currentSettings;

      if (!_.has(acc[current], 'enabled')) {
        strapi.log.warn(
          `(hook:${current}) wasn't loaded due to missing key \`enabled\` in the configuration`
        );
      }

      // Ensure that enabled key exist by forcing to false.
      _.defaults(acc[current], { enabled: false });

      return acc;
    },
    {}
  );

  // default settings
  strapi.config.port =
    _.get(strapi.config.currentEnvironment, 'server.port') ||
    strapi.config.port;
  strapi.config.host =
    _.get(strapi.config.currentEnvironment, 'server.host') ||
    strapi.config.host;

  // proxy settings
  const proxy = _.get(strapi.config.currentEnvironment, 'server.proxy', {});
  strapi.config.proxy = proxy;

  // check if proxy is enabled and construct url
  strapi.config.url = proxy.enabled
    ? getURLFromSegments({
        hostname: proxy.host,
        port: proxy.port,
        ssl: proxy.ssl,
      })
    : getURLFromSegments({
        hostname: strapi.config.host,
        port: strapi.config.port,
      });

  const adminPath = _.get(
    strapi.config.currentEnvironment.server,
    'admin.path',
    'admin'
  );

  strapi.config.admin.url = new URL(adminPath, strapi.config.url).toString();
};

const enableHookNestedDependencies = function(
  strapi,
  name,
  flattenHooksConfig,
  force = false
) {
  // Couldn't find configurations for this hook.
  if (_.isEmpty(_.get(flattenHooksConfig, name, true))) {
    // Check if database connector is used
    const modelsUsed = Object.keys(
      _.assign(_.clone(strapi.api) || {}, strapi.plugins)
    )
      .filter(x =>
        _.isObject(
          _.get(strapi.api, [x, 'models']) ||
            _.get(strapi.plugins, [x, 'models'])
        )
      ) // Filter API with models
      .map(
        x =>
          _.get(strapi.api, [x, 'models']) ||
          _.get(strapi.plugins, [x, 'models'])
      ) // Keep models
      .filter(models => {
        const apiModelsUsed = Object.keys(models).filter(model => {
          const connector = _.get(
            strapi.config.connections,
            models[model].connection,
            {}
          ).connector;

          if (connector) {
            return connector.replace('strapi-hook-', '') === name;
          }

          return false;
        });

        return apiModelsUsed.length !== 0;
      }); // Filter model with the right connector

    flattenHooksConfig[name] = {
      enabled: force || modelsUsed.length > 0, // Will return false if there is no model, else true.
    };

    // Enabled dependencies.
    if (_.get(strapi.hook, `${name}.dependencies`, []).length > 0) {
      strapi.hook[name].dependencies.forEach(dependency => {
        enableHookNestedDependencies(
          strapi,
          dependency.replace('strapi-hook-', ''),
          flattenHooksConfig,
          true
        );
      });
    }
  }
};
