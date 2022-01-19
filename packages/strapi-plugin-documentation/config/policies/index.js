'use strict';

module.exports = async (ctx, next) => {
  const pluginStore = strapi.store({
    environment: '',
    type: 'plugin',
    name: 'documentation',
  });
  const config = await pluginStore.get({ key: 'config' });

  const redirectToLogin = () => {
    const querystring = ctx.querystring ? `?${ctx.querystring}` : '';
    ctx.redirect(
      `${strapi.config.server.url}${strapi.plugins.documentation.config['x-strapi-config'].path}/login${querystring}`
    );
  };

  if (!config.restrictedAccess) {
    return await next();
  }

  if (!ctx.session.token) {
    return redirectToLogin();
  }

  const isValid = await strapi.plugins['documentation'].services.token.validate(ctx.session.token);

  if (!isValid) {
    ctx.session.token = null;
    return redirectToLogin();
  }

  // Execute the action.
  await next();
};
