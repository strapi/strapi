'use strict';

const _ = require('lodash');

module.exports = async (ctx, next) => {
  const { model } = ctx.params;

  const ct = strapi.contentTypes[model];

  if (!ct) {
    return ctx.send({ error: 'contentType.notFound' }, 404);
  }

  const target = ct.plugin === 'admin' ? strapi.admin : strapi.plugin(ct.plugin);

  const { route } = ctx.state;

  if (typeof route.handler !== 'string') {
    return next();
  }

  const [, action] = route.handler.split('.');

  const configPath =
    ct.plugin === 'admin'
      ? ['admin.layout', ct.modelName, 'actions', action]
      : ['plugin', ct.plugin, 'layout', ct.modelName, 'actions', action];

  const actionConfig = strapi.config.get(configPath);

  if (!_.isNil(actionConfig)) {
    const [controller, action] = actionConfig.split('.');

    if (controller && action) {
      return target.controllers[controller.toLowerCase()][action](ctx);
    }
  }

  await next();
};
