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
    const { slug, env } = ctx.params;

    if (env && _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badData(null, [{ messages: [{ id: 'request.error.environment.unknow' }] }]);

    const model = _.has(Service, slug) ? Service.database(slug, env) : undefined;

    if (_.isUndefined(model)) return ctx.badData(null, [{ messages: [{ id: 'request.error.config' }] }]);
    if (_.isFunction(model)) return ctx.badData(null, [{ messages: [{ id: 'request.error.environment.required' }] }]);

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

    let model;
    if (slug === 'database') {
      const name = params.database;

      model  = Service.database(name, env);

      if (!_.find(Service.getDatabases(env), { name })) model = undefined;

      delete params.database;
    } else model = _.has(Service, slug) ? Service[slug](env) : undefined;

    if (_.isUndefined(model)) return ctx.badData(null, [{ messages: [{ id: 'request.error.config' }] }]);

    const items = Service.getItems(model);

    params = Service.cleanParams(params, items);

    let validationErrors
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
  }
};
