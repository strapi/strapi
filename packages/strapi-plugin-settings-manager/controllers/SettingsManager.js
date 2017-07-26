'use strict';

const path = require('path');
const fs = require('fs');

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

    if (env && _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badData(null, [{ messages: [{ id: 'request.error.environment.unknow' }] }]);

    ctx.send({ databases: Service.getDatabases(env) });
  },

  database: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { name, env } = ctx.params;

    if (!env || _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badData(null, [{ messages: [{ id: 'request.error.environment.unknow' }] }]);
    if (!name || _.isEmpty(_.find(Service.getDatabases(env), { name }))) return ctx.badData(null, [{ messages: [{ id: 'request.error.database.unknow' }] }]);

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

    if (env && _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badData(null, [{ messages: [{ id: 'request.error.environment.unknow' }] }]);

    const model = _.has(Service, slug) ? Service[slug](env) : undefined;

    if (_.isUndefined(model)) return ctx.badData(null, [{ messages: [{ id: 'request.error.config' }] }]);

    ctx.send(model);
  },

  update: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { slug, env } = ctx.params;
    let params = ctx.request.body;

    if (env && _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badData(null, [{ messages: [{ id: 'request.error.environment.unknow' }] }]);

    const model = _.has(Service, slug) ? Service[slug](env) : undefined;

    if (_.isUndefined(model)) return ctx.badData(null, [{ messages: [{ id: 'request.error.config' }] }]);

    const items = Service.getItems(model);

    params = Service.cleanParams(params, items);

    let validationErrors;
    [params, validationErrors] = Service.paramsValidation(params, items);

    if (!_.isEmpty(validationErrors)) return ctx.badData(null, Service.formatErrors(validationErrors));

    const updateErrors = Service.updateSettings(params, items, env);

    if (!_.isEmpty(updateErrors)) return ctx.badData(null, Service.formatErrors(updateErrors));

    ctx.send({ ok: true });
  },

  createLanguage: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { name } = ctx.request.body;

    const languages = Service.getLanguages();
    const availableLanguages = strapi.plugins['settings-manager'].services.languages;

    if (_.find(languages, { name })) return ctx.badData(null, [{ messages: [{ id: 'request.error.languages.exist' }] }]);
    if (!_.find(availableLanguages, { value: name })) return ctx.badData(null, [{ messages: [{ id: 'request.error.languages.incorrect' }] }]);

    fs.writeFileSync(path.join(process.cwd(), 'config', 'locales', `${name}.json`), '{}');

    ctx.send({ ok: true });
  },

  deleteLanguage: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { name } = ctx.params;

    const languages = Service.getLanguages();

    if (!_.find(languages, { name })) return ctx.badData(null, [{ messages: [{ id: 'request.error.languages.notExist' }] }]);

    fs.unlinkSync(path.join(process.cwd(), 'config', 'locales', `${name}.json`));

    ctx.send({ ok: true });
  },

  createDatabase: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { env } = ctx.params;
    let params = ctx.request.body;

    const [name] = _.keys(params.databases.connections);

    if (env && _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badData(null, [{ messages: [{ id: 'request.error.environment.unknow' }] }]);
    if (name && _.find(Service.getDatabases(env), { name })) return ctx.badData(null, [{ messages: [{ id: 'request.error.database.exist' }] }]);

    const model = Service.databases(name, env);
    const items = Service.getItems(model);

    params = Service.cleanParams(params, items);

    let validationErrors;
    [params, validationErrors] = Service.paramsValidation(params, items);

    if (!_.isEmpty(validationErrors)) return ctx.badData(null, Service.formatErrors(validationErrors));

    const updateErrors = Service.updateSettings(params, items, env);

    if (!_.isEmpty(updateErrors)) return ctx.badData(null, Service.formatErrors(updateErrors));

    ctx.send({ ok: true });
  },

  updateDatabase: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { name, env } = ctx.params;
    let params = ctx.request.body;

    if (env && _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badData(null, [{ messages: [{ id: 'request.error.environment.unknow' }] }]);
    if (name && _.isEmpty(_.find(Service.getDatabases(env), { name }))) return ctx.badData(null, [{ messages: [{ id: 'request.error.database.unknow' }] }]);

    const model = Service.databases(name, env);
    let items = Service.getItems(model);

    params = Service.cleanParams(params, items);

    let validationErrors;
    [params, validationErrors] = Service.paramsValidation(params, items);

    if (!_.isEmpty(validationErrors)) return ctx.badData(null, Service.formatErrors(validationErrors));

    const newName = _.get(params, `databases.connections.${name}.name`);

    if (newName && newName !== name) {
      params = _.assign(_.clone(strapi.config.environments[env].databases.connections[name]), params.databases.connections[name]);
      delete params.name;

      const connections = _.clone(strapi.config.environments[env].databases.connections);
      connections[newName] = params;
      connections[name] = undefined;

      params = { databases: { connections }};

      items = [{ target: 'databases.connections' }];
    }

    const updateErrors = Service.updateSettings(params, items, env);

    if (!_.isEmpty(updateErrors)) return ctx.badData(null, Service.formatErrors(updateErrors));

    ctx.send({ ok: true });
  },

  deleteDatabase: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { name, env } = ctx.params;

    if (env && _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badData(null, [{ messages: [{ id: 'request.error.environment.unknow' }] }]);
    if (name && _.isEmpty(_.find(Service.getDatabases(env), { name }))) return ctx.badData(null, [{ messages: [{ id: 'request.error.database.unknow' }] }]);

    const connections = _.clone(strapi.config.environments[env].databases.connections);
    connections[name] = undefined;

    const params = { databases: { connections }};
    const items = [{ target: 'databases.connections' }];

    const updateErrors = Service.updateSettings(params, items, env);

    if (!_.isEmpty(updateErrors)) return ctx.badData(null, Service.formatErrors(updateErrors));

    ctx.send({ ok: true });
  }
};
