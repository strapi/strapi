'use strict';

module.exports = {
  menu: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;

    ctx.send(Service.menu);
  },

  environments: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;

    ctx.send({ environments: Service.getEnvironments() });
  },

  get: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { slug, env } = ctx.params;

    if (env && _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badData('request.error.environment.unknow');

    const model = env ? Service[slug](env) : Service[slug];

    if (_.isUndefined(model)) return ctx.badData('request.error.config');
    if (_.isFunction(model)) return ctx.badData('request.error.environment.required');

    ctx.send(model);
  },

  update: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { slug, env } = ctx.params;
    let params = ctx.request.body;

    if (env && _.isEmpty(_.find(Service.getEnvironments(), { name: env }))) return ctx.badData('request.error.environment.unknow');

    const model = env ? Service[slug](env) : Service[slug];

    if (_.isUndefined(model)) return ctx.badData('request.error.config');
    if (_.isFunction(model)) return ctx.badData('request.error.environment.required');

    const items = Service.getItems(model);

    params = Service.cleanParams(params, items);

    let validationErrors = Service.paramsValidation(params, items);

    if (!_.isEmpty(validationErrors)) {
      return ctx.badData(null, validationErrors);
    }

    Service.updateSettings(params, items, env);

    ctx.send();
  },
};
