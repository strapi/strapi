import type { Context } from 'koa';
import { getService } from '../utils';

/** @type {import('.').AuthenticateFunction} */
export const authenticate = async (ctx: Context) => {
  const { authorization } = ctx.request.header;

  if (!authorization) {
    return { authenticated: false };
  }

  const parts = authorization.split(/\s+/);

  if (parts[0].toLowerCase() !== 'bearer' || parts.length !== 2) {
    return { authenticated: false };
  }

  const token = parts[1];
  const { payload, isValid } = getService('token').decodeJwtToken(token);

  if (!isValid) {
    return { authenticated: false };
  }

  const user = await strapi.db
    .query('admin::user')
    .findOne({ where: { id: payload.id }, populate: ['roles'] });

  if (!user || !(user.isActive === true)) {
    return { authenticated: false };
  }

  const userAbility = await getService('permission').engine.generateUserAbility(user);

  // TODO: use the ability from ctx.state.auth instead of
  // ctx.state.userAbility, and remove the assign below
  ctx.state.userAbility = userAbility;
  ctx.state.user = user;

  return {
    authenticated: true,
    credentials: user,
    ability: userAbility,
  };
};

export const name = 'admin';

/** @type {import('.').AuthStrategy} */
export default {
  name,
  authenticate,
};
