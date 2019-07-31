const _ = require('lodash');

module.exports = async (ctx, next) => {
  const { source } = ctx.request.query;

  const target = source === 'admin' ? strapi.admin : strapi.plugins[source];

  if (
    source &&
    _.get(target, [
      'config',
      'layout',
      ctx.params.model,
      'actions',
      ctx.request.route.action,
    ])
  ) {
    const [controller, action] = _.get(
      target,
      [
        'config',
        'layout',
        ctx.params.model,
        'actions',
        ctx.request.route.action,
      ],
      []
    ).split('.');

    if (controller && action) {
      return await target.controllers[controller.toLowerCase()][action](ctx);
    }
  }

  await next();
};
