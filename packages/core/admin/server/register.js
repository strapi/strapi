/* eslint-disable no-unused-vars */
'use strict';

// const permissionsFieldsToPropertiesMigration = require('../migrations/permissions-fields-to-properties');

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

      return { authenticated: true, credentials: user };
    }

    return { error: 'Invalid credentials' };
  },
  // async verify() {},
};

module.exports = () => {
  const passportMiddleware = strapi.admin.services.passport.init();

  strapi.server.api('admin').use(passportMiddleware);
  strapi.container.get('auth').register('admin', adminAuthStrategy);

  // FIXME: to implement
  // strapi.db.migrations.register(permissionsFieldsToPropertiesMigration);
};
