import type Koa from 'koa';
import type {} from 'koa-session';

import type { Config } from '../types';

export default async (ctx: Koa.Context, next: Koa.Next) => {
  const pluginStore = strapi.store({ type: 'plugin', name: 'documentation' });

  const config = (await pluginStore.get({ key: 'config' })) as Config;

  if (!config.restrictedAccess) {
    return next();
  }

  if (!ctx.session || !ctx.session.documentation || !ctx.session.documentation.logged) {
    const querystring = ctx.querystring ? `?${ctx.querystring}` : '';

    return ctx.redirect(`${strapi.config.server.url}/documentation/login${querystring}`);
  }

  // Execute the action.
  return next();
};
