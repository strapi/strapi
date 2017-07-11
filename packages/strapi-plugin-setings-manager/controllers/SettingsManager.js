'use strict';

module.exports = {
  menu: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;

    ctx.send(Service.menu);
  },

  environments: async ctx => {
    let envs = _.map(_.keys(strapi.config.environments), env => {
      return {
        name: env,
        active: (strapi.config.environment === env)
      }
    });

    ctx.send({ environments: envs });
  },

  get: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { slug, env } = ctx.params;

    ctx.send(env ? Service[slug](env) : Service[slug]);
  },

  update: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { slug, env } = ctx.params;
    let params = ctx.request.body;

    const model = env ? Service[slug](env) : Service[slug];
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
