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

    ctx.send({ environments: Service.getLanguages() });
  },

  get: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { slug, env } = ctx.params;

    if (env && _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badData(null, [{ messages: [{ id: 'request.error.environment.unknow' }] }]);

    const model = Service[slug](env);

    if (_.isUndefined(model)) return ctx.badData(null, [{ messages: [{ id: 'request.error.config' }] }]);
    if (_.isFunction(model)) return ctx.badData(null, [{ messages: [{ id: 'request.error.environment.required' }] }]);

    ctx.send(model);
  },

  update: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { slug, env } = ctx.params;
    let params = ctx.request.body;

    if (env && _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badData(null, [{ messages: [{ id: 'request.error.environment.unknow' }] }]);

    const model = Service[slug](env);

    if (_.isUndefined(model)) return ctx.badData(null, [{ messages: [{ id: 'request.error.config' }] }]);
    if (_.isFunction(model)) return ctx.badData(null, [{ messages: [{ id: 'request.error.environment.required' }] }]);

    const items = Service.getItems(model);

    params = Service.cleanParams(params, items);

    const validationErrors = Service.paramsValidation(params, items);

    if (!_.isEmpty(validationErrors)) return ctx.badData(null, Service.formatErrors(validationErrors));

    const updateErrors = Service.updateSettings(params, items, env);

    if (!_.isEmpty(updateErrors)) return ctx.badData(null, Service.formatErrors(updateErrors));

    ctx.send();
  },

  createLanguage: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { name } = ctx.request.body;

    const languages = Service.getLanguages();

    if (_.find(languages, { name })) return ctx.badData(null, [{ messages: [{ id: 'request.error.languages.exist' }] }]);

    fs.writeFileSync(path.join(process.cwd(), 'config', 'locales', `${name}.json`), '{}');

    ctx.send();
  },

  deleteLanguage: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { name } = ctx.params;

    const languages = Service.getLanguages();

    if (!_.find(languages, { name })) return ctx.badData(null, [{ messages: [{ id: 'request.error.languages.notExist' }] }]);

    fs.unlinkSync(path.join(process.cwd(), 'config', 'locales', `${name}.json`));

    ctx.send();
  }
};
