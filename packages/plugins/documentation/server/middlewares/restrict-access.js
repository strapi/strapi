'use strict';

const { UnauthorizedError } = require('@strapi/utils/lib/errors');

module.exports = async (ctx, next) => {
  const pluginStore = strapi.store({ type: 'plugin', name: 'documentation' });

  const config = await pluginStore.get({ key: 'config' });

  if (!config.restrictedAccess) {
    return next();
  }

  if (!ctx.session.documentation || !ctx.session.documentation.logged) {
    const querystring = ctx.querystring ? `?${ctx.querystring}` : '';

    if (ctx.is('html')) {
      return ctx.redirect(
        `${strapi.config.server.url}${
          strapi.config.get('plugin.documentation.x-strapi-config').path
        }/login${querystring}`
      );
    }
    throw new UnauthorizedError('Unable to use this endpoint, it is protected by a password');
  }

  // Execute the action.
  return next();
};
