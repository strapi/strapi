const _ = require('lodash');

module.exports = async (ctx, next) => {
  const route = ctx.request.route;
  let role = '1';

  if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
    try {
      const tokenUser = await strapi.plugins['users-permissions'].services.jwt.getToken(ctx);

      ctx.state.user = await strapi.plugins['users-permissions'].services.user.fetch(_.pick(tokenUser, ['_id', 'id']));

    } catch (err) {
      return ctx.unauthorized(err);
    }

    if (!ctx.state.user) {
      return ctx.unauthorized('This user doesn\'t exit.');
    }

    role = ctx.state.user.role;

    if (role.toString() === '0') {
      return await next();
    }
  }

  const permission = _.get(strapi.plugins['users-permissions'].config, ['roles', role.toString(), 'permissions', route.plugin || 'application', 'controllers', route.controller, route.action]);

  if (!permission) {
    return await next();
  }

  if (permission.enabled && permission.policy) {
    try {
      await strapi.plugins['users-permissions'].config.policies[permission.policy](ctx, next);
    } catch (err) {
      ctx.unauthorized(err);
    }
  } else if (permission.enabled) {
    await next();
  } else {
    ctx.unauthorized('Access restricted for this action.');
  }
};
