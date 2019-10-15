module.exports = async (ctx, next) => {
  const pluginStore = strapi.store({
    environment: '',
    type: 'plugin',
    name: 'documentation',
  });
  const config = await pluginStore.get({ key: 'config' });

  if (!config.restrictedAccess) {
    return await next();
  }

  if (!ctx.session.documentation) {
    const querystring = ctx.querystring ? `?${ctx.querystring}` : '';

    return ctx.redirect(`${strapi.plugins.documentation.config['x-strapi-config'].path}/login${querystring}`);
  }
  const isValid = strapi.plugins['users-permissions'].services.user.validatePassword(ctx.session.documentation, config.password);

  if (!isValid) {
    ctx.session.documentation = null;
  }

  // Execute the action.
  await next();
};
