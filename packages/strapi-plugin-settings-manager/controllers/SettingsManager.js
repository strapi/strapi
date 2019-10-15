'use strict';

const path = require('path');
const fs = require('fs');
const _ = require('lodash');

module.exports = {
  menu: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;

    ctx.send(Service.menu);
  },

  environments: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;

    ctx.send({ environments: Service.getEnvironments() });
  },

  languages: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;

    ctx.send({ languages: Service.getLanguages() });
  },

  databases: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { env } = ctx.params;

    if (!env || _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.environment.unknow' }] }]);

    ctx.send({ databases: Service.getDatabases(env) });
  },

  database: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { name, env } = ctx.params;

    if (!env || _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.environment.unknow' }] }]);
    if (!name || _.isEmpty(_.find(Service.getDatabases(env), { name }))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.database.unknow' }] }]);

    const model = Service.databases(name, env);

    ctx.send(model);
  },

  databaseModel: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const env = strapi.config.environment;

    const model = Service.databases('${name}', env);

    ctx.send(model);
  },

  get: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { slug, env } = ctx.params;

    if (env && _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.environment.unknow' }] }]);

    _.has(Service, slug) ? ctx.send(await Service[slug](env)) : ctx.badRequest(null, [{ messages: [{ id: 'request.error.config' }] }]);
  },

  update: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { slug, env } = ctx.params;
    let params = ctx.request.body;

    if (env && _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.environment.unknow' }] }]);

    let model;
    if (_.has(Service, slug)) {
      model = await Service[slug](env);
    } else {
      return ctx.badRequest(null, [{ messages: [{ id: 'request.error.config' }] }]);
    }

    const items = Service.getItems(model);

    params = Service.cleanParams(params, items);

    let validationErrors;
    [params, validationErrors] = Service.paramsValidation(params, items);

    if (!_.isEmpty(validationErrors)) return ctx.badRequest(null, Service.formatErrors(validationErrors));

    strapi.reload.isWatching = false;

    const updateErrors = await Service.updateSettings(params, items, env);

    !_.isEmpty(updateErrors) ? ctx.badRequest(null, Service.formatErrors(updateErrors)) : ctx.send({ ok: true });

    strapi.reload();
  },

  createLanguage: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { name } = ctx.request.body;

    const languages = Service.getLanguages();
    const availableLanguages = strapi.plugins['settings-manager'].services.languages;

    if (_.find(languages, { name: _.lowerCase(name).replace(' ', '_') })) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.languages.exist' }] }]);
    if (!_.find(availableLanguages, { value: name })) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.languages.incorrect' }] }]);

    const filePath = path.join(strapi.config.appPath, 'config', 'locales', `${name}.json`);

    try {
      fs.writeFileSync(filePath, '{}');

      ctx.send({ ok: true });

      strapi.reload();
    } catch (e) {
      ctx.badRequest(null, Service.formatErrors([{
        target: 'name',
        message: 'request.error.config',
        params: {
          filePath: filePath
        }
      }]));
    }
  },

  deleteLanguage: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { name } = ctx.params;

    const languages = Service.getLanguages();

    if (!_.find(languages, { name })) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.languages.unknow' }] }]);

    const filePath = path.join(strapi.config.appPath, 'config', 'locales', `${name}.json`);

    try {
      fs.unlinkSync(filePath);

      ctx.send({ ok: true });
      strapi.reload();
    } catch (e) {
      ctx.badRequest(null, Service.formatErrors([{
        target: 'name',
        message: 'request.error.config',
        params: {
          filePath: filePath
        }
      }]));
    }
  },

  createDatabase: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { env } = ctx.params;
    let params = ctx.request.body;

    if (!env || _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.environment.unknow' }] }]);

    const [name] = _.keys(params.database.connections);

    if (!name || _.find(Service.getDatabases(env), { name })) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.database.exist' }] }]);

    const model = Service.databases(name, env);
    const items = Service.getItems(model);

    params = Service.cleanParams(params, items);

    let validationErrors;
    [params, validationErrors] = Service.paramsValidation(params, items);

    params.database.connections[name].connector = Service.getClientConnector(params.database.connections[name].settings.client);

    if (!_.isEmpty(validationErrors)) return ctx.badRequest(null, Service.formatErrors(validationErrors));

    if (_.isEmpty(_.keys(strapi.config.environments[env].database.connections)) || _.isEmpty(strapi.config.environments[env].database.defaultConnection)) {
      params.database.defaultConnection = name;
      items.push({
        target: 'database.defaultConnection'
      });
    }

    Service.installDependency(params, name);

    strapi.reload.isWatching = false;

    const updateErrors = Service.updateSettings(params, items, env);

    if (!_.isEmpty(updateErrors)) return ctx.badRequest(null, Service.formatErrors(updateErrors));

    ctx.send({ ok: true });

    strapi.reload();
  },

  updateDatabase: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { name, env } = ctx.params;
    let params = ctx.request.body;

    if (!env || _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.environment.unknow' }] }]);
    if (!name || _.isEmpty(_.find(Service.getDatabases(env), { name }))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.database.unknow' }] }]);

    const model = Service.databases(name, env);
    let items = Service.getItems(model);

    params = Service.cleanParams(params, items);

    let validationErrors;
    [params, validationErrors] = Service.paramsValidation(params, items);

    if (!_.isEmpty(validationErrors)) return ctx.badRequest(null, Service.formatErrors(validationErrors));

    const newName = _.get(params, `database.connections.${name}.name`);
    const defaultConnection = params.database.defaultConnection;

    if (params.database.connections) {
      const settings = _.assign(_.clone(strapi.config.environments[env].database.connections[name].settings), params.database.connections[name].settings);
      const options = _.assign(_.clone(strapi.config.environments[env].database.connections[name].options), params.database.connections[name].options);
      params = _.assign(_.clone(strapi.config.environments[env].database.connections[name]), params.database.connections[name]);
      params.settings = settings;
      params.options = options;
    }

    delete params.name;

    const connections = _.clone(strapi.config.environments[env].database.connections);


    if (newName && newName !== name) {
      connections[newName] = params;
      connections[name] = undefined;

      _.forEach(strapi.models, (model, modelName) => {
        if (name === model.connection) {
          const [searchFilePath, getModelPathErrors] = Service.getModelPath(modelName);

          if (!_.isEmpty(getModelPathErrors)) {
            return ctx.badRequest(null, Service.formatErrors(getModelPathErrors));
          }

          try {
            const modelJSON = require(searchFilePath);
            modelJSON.connection = newName;

            try {
              fs.writeFileSync(searchFilePath, JSON.stringify(modelJSON, null, 2), 'utf8');
            } catch (e) {
              return ctx.badRequest(null, Service.formatErrors([{
                id: 'request.error.mode.write',
                params: {
                  filePath: searchFilePath
                }
              }]));
            }
          } catch (e) {
            return ctx.badRequest(null, Service.formatErrors([{
              id: 'request.error.mode.read',
              params: {
                filePath: searchFilePath
              }
            }]));
          }
        }
      });
    } else if (params.settings) {
      connections[name] = params;
    }

    params = { database: { connections }};

    items = [{ target: 'database.connections' }];

    if (newName && newName !== name && strapi.config.environments[env].database.defaultConnection === name) {
      params.database.defaultConnection = newName;
      items.push({
        target: 'database.defaultConnection'
      });
    } else if (defaultConnection) {
      params.database.defaultConnection = defaultConnection;
      items.push({
        target: 'database.defaultConnection'
      });
    }

    const newClient = _.get(params, `database.connections.${name}.settings.client`);

    if (newClient) params.database.connections[name].connector = Service.getClientConnector(newClient);

    strapi.reload.isWatching = false;

    const cleanErrors = Service.cleanDependency(env, params);

    if (!_.isEmpty(cleanErrors)) {
      return ctx.badRequest(null, Service.formatErrors(cleanErrors));
    }

    Service.installDependency(params, name);

    const updateErrors = Service.updateSettings(params, items, env);

    !_.isEmpty(updateErrors) ? ctx.badRequest(null, Service.formatErrors(updateErrors)) : ctx.send({ ok: true });

    strapi.reload();
  },

  deleteDatabase: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { name, env } = ctx.params;

    if (!env || _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.environment.unknow' }] }]);
    if (!name || _.isEmpty(_.find(Service.getDatabases(env), { name }))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.database.unknow' }] }]);

    const connections = _.clone(strapi.config.environments[env].database.connections);
    connections[name] = undefined;

    const params = { database: { connections }};
    const items = [{ target: 'database.connections' }];

    if (strapi.config.environments[env].database.defaultConnection === name) {
      params.database.defaultConnection = '';
      items.push({
        target: 'database.defaultConnection'
      });
    }

    strapi.reload.isWatching = false;

    const updateErrors = Service.updateSettings(params, items, env);

    !_.isEmpty(updateErrors) ? ctx.badRequest(null, Service.formatErrors(updateErrors)) : ctx.send({ ok: true });

    strapi.reload();
  }
};
