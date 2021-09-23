'use strict';

const adminAuthStrategy = {
  name: 'admin',
  async authenticate(ctx) {
    const { authorization } = ctx.request.header;

    if (!authorization) {
      return { authenticated: false };
    }

    const parts = authorization.split(/\s+/);

    if (parts[0] !== 'Bearer' || parts.length !== 2) {
      return { authenticated: false };
    }

    const token = parts[1];
    const { payload, isValid } = strapi.admin.services.token.decodeJwtToken(token);

    if (isValid) {
      const user = await strapi
        .query('admin::user')
        .findOne({ where: { id: payload.id }, populate: ['roles'] });

      if (!user || !(user.isActive === true)) {
        return { error: 'Invalid credentials' };
      }

      const userAbility = await strapi.admin.services.permission.engine.generateUserAbility(user);

      ctx.state.userAbility = userAbility;
      ctx.state.user = user;
      ctx.state.isAuthenticatedAdmin = true;

      return { authenticated: true, credentials: user };
    }

    return { error: 'Invalid credentials' };
  },
};

module.exports = () => {
  const passportMiddleware = strapi.admin.services.passport.init();

  strapi.server.api('admin').use(passportMiddleware);
  strapi.container.get('auth').register('admin', adminAuthStrategy);
};
