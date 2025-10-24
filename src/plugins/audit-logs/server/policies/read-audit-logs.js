'use strict';

module.exports = async (ctx, next) => {
  const { user } = ctx.state;

  if (!user) return ctx.unauthorized('You must be logged in.');

  const hasPermission = user.roles?.some(role =>
    role.permissions?.some(p => p.action === 'plugin::users-permissions.read_audit_logs')
  );

  if (!hasPermission) return ctx.forbidden('You are not allowed to view audit logs.');

  await next();
};

