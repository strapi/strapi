const _ = require('lodash');

module.exports = async (ctx, next) => {
  const route = ctx.request.route;
  let role = '1';

  if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
    try {
      ctx.state.user = await strapi.plugins['users-permissions'].services.jwt.getToken(ctx);
      role = ctx.state.user.role;
    } catch (err) {
      ctx.unauthorized(err);
    }
  }

  const permission = _.get(_.clone(strapi.plugins['users-permissions'].config), [role.toString(), 'permissions', route.plugin || 'application', 'controllers', route.controller, route.action]);

  if (permission.enabled && permission.policy) {
    try {
      await require(`./${permission.policy}.js`)(ctx, next);
    } catch (err) {
      ctx.unauthorized(err);
    }
  } else if (permission.enabled) {
    await next();
  } else {
    ctx.unauthorized('Access restricted for this action.');
  }
};
