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

    ctx.send({
      environments: envs
    });
  },

  form: async ctx => {
    const Service = strapi.plugins['settings-manager'].services.settingsmanager;
    const { slug, env } = ctx.params;

    ctx.send(env ? Service[slug](env) : Service[slug]);
  },
};
