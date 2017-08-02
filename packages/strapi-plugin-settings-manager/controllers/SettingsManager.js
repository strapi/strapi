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

    if (!env || _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.environment.unknown' }] }]);

    ctx.send({ databases: Service.getDatabases(env) });
  },

  database: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { name, env } = ctx.params;

    if (!env || _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.environment.unknown' }] }]);
    if (!name || _.isEmpty(_.find(Service.getDatabases(env), { name }))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.database.unknow' }] }]);

    const model = Service.databases(name, env);

    ctx.send(model);
  },

  databaseModel: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { env } = ctx.params;

    const model = Service.databases('${name}', env);

    ctx.send(model);
  },

  get: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { slug, env } = ctx.params;

    if (env && _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.environment.unknown' }] }]);

    _.has(Service, slug) ? ctx.send(Service[slug](env)) : ctx.badRequest(null, [{ messages: [{ id: 'request.error.config' }] }]);
  },

  update: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { slug, env } = ctx.params;
    let params = ctx.request.body;

    if (env && _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.environment.unknown' }] }]);

    let model;
    if (_.has(Service, slug)) {
      model = Service[slug](env);
    } else {
      return ctx.badRequest(null, [{ messages: [{ id: 'request.error.config' }] }]);
    }

    const items = Service.getItems(model);

    params = Service.cleanParams(params, items);

    let validationErrors;
    [params, validationErrors] = Service.paramsValidation(params, items);

    if (!_.isEmpty(validationErrors)) return ctx.badRequest(null, Service.formatErrors(validationErrors));

    strapi.reload.isWatching = false;

    const updateErrors = Service.updateSettings(params, items, env);

    !_.isEmpty(updateErrors) ? ctx.badRequest(null, Service.formatErrors(updateErrors)) : ctx.send({ ok: true });

    strapi.reload();
  },

  createLanguage: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { name } = ctx.request.body;

    const languages = Service.getLanguages();
    const availableLanguages = strapi.plugins['settings-manager'].services.languages;

    if (_.find(languages, { name })) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.languages.exist' }] }]);
    if (!_.find(availableLanguages, { value: name })) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.languages.incorrect' }] }]);

    const filePath = path.join(strapi.config.appPath, 'config', 'locales', `${name}.json`);

    try {
      fs.writeFileSync(filePath, '{}');

      ctx.send({ ok: true });
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
    } catch (e) {
      ctx.badRequest(null, Service.formatErrors([{
        target: 'name',
        message: 'request.error.config',
        params: {
          filePath: filePath
        }
      }]));
    }

    ctx.send({ ok: true });
  },

  createDatabase: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { env } = ctx.params;
    let params = ctx.request.body;

    console.log(params);

    const [name] = _.keys(params.database.connections);

    if (!env || _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.environment.unknown' }] }]);
    if (!name || _.find(Service.getDatabases(env), { name })) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.database.exist' }] }]);

    const model = Service.databases(name, env);
    const items = Service.getItems(model);

    params = Service.cleanParams(params, items);

    let validationErrors;
    [params, validationErrors] = Service.paramsValidation(params, items);

    params.database.connections[name].connector = Service.getClientConnector(params.database.connections[name].settings.client);

    if (!_.isEmpty(validationErrors)) return ctx.badRequest(null, Service.formatErrors(validationErrors));

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

    if (!env || _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.environment.unknown' }] }]);
    if (!name || _.isEmpty(_.find(Service.getDatabases(env), { name }))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.database.unknow' }] }]);

    const model = Service.databases(name, env);
    let items = Service.getItems(model);

    params = Service.cleanParams(params, items);

    let validationErrors;
    [params, validationErrors] = Service.paramsValidation(params, items);

    if (!_.isEmpty(validationErrors)) return ctx.badRequest(null, Service.formatErrors(validationErrors));

    const newName = _.get(params, `database.connections.${name}.name`);

    if (newName && newName !== name) {
      params = _.assign(_.clone(strapi.config.environments[env].database.connections[name]), params.database.connections[name]);
      delete params.name;

      const connections = _.clone(strapi.config.environments[env].database.connections);
      connections[newName] = params;
      connections[name] = undefined;

      params = { databases: { connections }};

      items = [{ target: 'databases.connections' }];
    }

    strapi.reload.isWatching = false;

    Service.installDependency(params, newName);

    const updateErrors = Service.updateSettings(params, items, env);

    !_.isEmpty(updateErrors) ? ctx.badRequest(null, Service.formatErrors(updateErrors)) : ctx.send({ ok: true });

    strapi.reload();
  },

  deleteDatabase: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { name, env } = ctx.params;

    if (!env || _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.environment.unknown' }] }]);
    if (!name || _.isEmpty(_.find(Service.getDatabases(env), { name }))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.database.unknow' }] }]);

    const connections = _.clone(strapi.config.environments[env].databases.connections);
    connections[name] = undefined;

    const params = { databases: { connections }};
    const items = [{ target: 'databases.connections' }];

    strapi.reload.isWatching = false;

    const updateErrors = Service.updateSettings(params, items, env);

    !_.isEmpty(updateErrors) ? ctx.badRequest(null, Service.formatErrors(updateErrors)) : ctx.send({ ok: true });

    strapi.reload();
  }
};
