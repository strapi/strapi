'use strict';

const passport = require('koa-passport');

const utils = require('./utils');

const isProduction = process.env.NODE_ENV === 'production';

const authenticate = async (ctx, next) => {
  const {
    params: { provider },
  } = ctx;
  const redirectUrls = utils.getPrefixedRedirectUrls();

  return passport.authenticate(provider, null, async (error, profile) => {
    if (error || !profile) {
      if (error) {
        strapi.log.error(error);
      }

      return ctx.redirect(redirectUrls.error);
    }

    const { email, firstname, lastname, username } = profile;
    const user = await strapi.admin.services.user.findOne({ email });

    // If a profile exists with this email, login with this user
    if (user) {
      ctx.state.user = user;
      return next();
    }

    const adminStore = await utils.getAdminStore();
    const { providers } = await adminStore.get({ key: 'auth' });

    // We need at least the username or the firstname/lastname combination to register a new user
    const isMissingRegisterFields = !username && (!firstname || !lastname);

    if (!providers.autoRegister || !providers.defaultRole || isMissingRegisterFields) {
      return ctx.redirect(redirectUrls.error);
    }

    const defaultRole = await strapi.admin.services.role.findOne({ id: providers.defaultRole });

    // If the default role has been misconfigured, redirect with an error
    if (!defaultRole) {
      return ctx.redirect(redirectUrls.error);
    }

    // Register a new user with the information given by the provider and login with it
    ctx.state.user = await strapi.admin.services.user.create({
      email,
      username,
      firstname,
      lastname,
      roles: [defaultRole.id],
      isActive: true,
      registrationToken: null,
    });

    return next();
  })(ctx, next);
};

const redirectWithAuth = ctx => {
  const { user } = ctx.state;
  const jwt = strapi.admin.services.token.createJwtToken(user);
  const cookiesOptions = { httpOnly: false, secure: isProduction, overwrite: true };
  const redirectUrls = utils.getPrefixedRedirectUrls();

  ctx.cookies.set('jwtToken', jwt, cookiesOptions);
  ctx.redirect(redirectUrls.success);
};

module.exports = {
  authenticate,
  redirectWithAuth,
};
