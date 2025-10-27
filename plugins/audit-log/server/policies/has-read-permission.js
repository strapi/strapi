'use strict';

module.exports = async (ctx, next) => {
  const user = ctx.state.user;
  if (!user) return ctx.unauthorized('Authentication required');

  if (user.role && user.role.type === 'root') {
    return await next();
  }

  try {
    const allowed = await strapi.admin.services.permission.engine.verifyPolicy({
      user: user,
      action: 'plugin::audit-log.read_audit_logs'
    });

    if (allowed) return await next();
  } catch (e) {
    try {
      const hasPermission = await strapi
        .plugin('users-permissions')
        .service('user')
        .hasPermissions(user.id, [`plugin::audit-log.read_audit_logs`]);
      if (hasPermission) return await next();
    } catch (err) {
    }
  }

  return ctx.forbidden('You do not have permission to read audit logs');
};
