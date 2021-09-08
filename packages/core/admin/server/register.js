/* eslint-disable no-unused-vars */
'use strict';

// const permissionsFieldsToPropertiesMigration = require('../migrations/permissions-fields-to-properties');

/**
 * Tries to authenticated admin user and calls next.
 * @param {KoaContext} ctx
 * @param {Middleware} next
 * @returns {undefined}
 */
const authMiddleware = async (ctx, next) => {
  if (!ctx.request.header.authorization) {
    return next();
  }

  if (
    ctx.request.header.authorization &&
    ctx.request.header.authorization.split(' ')[0] === 'Bearer'
  ) {
    const token = ctx.request.header.authorization.split(' ')[1];

    const { payload, isValid } = strapi.admin.services.token.decodeJwtToken(token);

    if (isValid) {
      const admin = await strapi
        .query('admin::user')
        .findOne({ where: { id: payload.id }, populate: ['roles'] });

      if (!admin || !(admin.isActive === true)) {
        return ctx.unauthorized('Invalid credentials');
      }

      // TODO: use simple user & isAuthenticated

      ctx.state.admin = admin;
      ctx.state.user = admin;
      ctx.state.userAbility = await strapi.admin.services.permission.engine.generateUserAbility(
        admin
      );

      ctx.state.isAuthenticatedAdmin = true;

      return next();
    }
  }

  ctx.unauthorized('Invalid credentials');
};

module.exports = () => {
  const passportMiddleware = strapi.admin.services.passport.init();

  strapi.server.api('admin').use(passportMiddleware);
  strapi.server.api('admin').use(authMiddleware);

  // FIXME: to implement
  // strapi.db.migrations.register(permissionsFieldsToPropertiesMigration);
};
