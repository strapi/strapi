import { Context, Next } from 'koa';

interface Permission {
  action: string;
  [key: string]: any;
}

export default async (ctx: Context, next: Next) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.unauthorized('You must be logged in.');
  }

  const role = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { id: user.role.id },
    populate: ['permissions'],
  });

  if (!role) {
    return ctx.forbidden('Role not found.');
  }

  const hasPermission = (role.permissions as Permission[]).some(
    (p: Permission) => p.action === 'plugin::audit-log.read'
  );

  if (!hasPermission) {
    return ctx.forbidden('You are not allowed to read audit logs.');
  }

  await next();
};
