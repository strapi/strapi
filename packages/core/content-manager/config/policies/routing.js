'use strict';

const _ = require('lodash');

module.exports = async (ctx, next) => {
  const { model } = ctx.params;

  const ct = strapi.contentTypes[model];

  if (!ct) {
    return ctx.send({ error: 'contentType.notFound' }, 404);
  }

  const target = ct.plugin === 'admin' ? strapi.admin : strapi.plugin(ct.plugin);
  const configPath =
    ct.plugin === 'admin'
      ? ['server.admin.layout', ct.modelName, 'actions', ctx.request.route.action]
      : ['plugin', ct.plugin, 'layout', ct.modelName, 'actions', ctx.request.route.action];

  const actionConfig = strapi.config.get(configPath);

  if (!_.isNil(actionConfig)) {
    const [controller, action] = actionConfig.split('.');

    if (controller && action) {
      return await target.controllers[controller.toLowerCase()][action](ctx);
    }
  }

  await next();
};
