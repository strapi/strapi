'use strict';

const passport = require('koa-passport');
const compose = require('koa-compose');

const login = compose([
  (ctx, next) => {
    return passport.authenticate('local', { session: false }, (err, user, info) => {
      if (err) {
        ctx.body = { error: 'Internal server error' };
      } else if (!user) {
        ctx.body = { error: info.error };
      } else {
        ctx.state.user = user;
        return next();
      }
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
]);

module.exports = {
  login,
};
