'use strict';

const passport = require('koa-passport');
const compose = require('koa-compose');

module.exports = {
  login: compose([
    (ctx, next) => {
      return passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err) {
          return ctx.badImplementation();
        }

        if (!user) {
          return ctx.badRequest(info.error);
        }

        ctx.state.user = user;
        return next();
      })(ctx, next);
    },
    ctx => {
      const { user } = ctx.state;

      ctx.body = {
        data: {
          token: strapi.admin.services.auth.createJwtToken(user),
          user: strapi.admin.services.auth.sanitizeUser(ctx.state.user), // TODO: fetch more detailed info
        },
      };
    },
  ]),

  renewToken(ctx) {
    const { token } = ctx.request.body;

    if (token === undefined) {
      return ctx.badRequest('Token is required.');
    }

    const { isValid, payload } = strapi.admin.services.auth.decodeToken(token);

    if (!isValid) {
      return ctx.badRequest('Invalid token.');
    }

    ctx.body = {
      data: {
        token: strapi.admin.services.auth.createJwtToken(payload.id),
      },
    };
  },
};
