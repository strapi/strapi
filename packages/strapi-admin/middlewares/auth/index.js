'use strict';

const passport = require('koa-passport');
const { Strategy: LocalStrategy } = require('passport-local');

const createLocalStrategy = strapi => {
  return new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      session: false,
    },
    function(email, password, done) {
      return strapi.admin.services.auth
        .checkCredentials({ email, password })
        .then(([error, user, message]) => done(error, user, message))
        .catch(err => done(err));
    }
  );
};

module.exports = strapi => ({
  initialize() {
    passport.use(createLocalStrategy(strapi));

    strapi.app.use(passport.initialize());

    strapi.app.use(async (ctx, next) => {
      if (
        ctx.request.header.authorization &&
        ctx.request.header.authorization.split(' ')[0] === 'Bearer'
      ) {
        const token = ctx.request.header.authorization.split(' ')[1];

        const { payload, isValid } = strapi.admin.services.auth.decodeToken(token);

        if (isValid) {
          // request is made by an admin
          const admin = await strapi
            .query('administrator', 'admin')
            .findOne({ id: payload.id }, []);

          if (!admin || admin.blocked === true) {
            return ctx.forbidden('Invalid credentials');
          }

          ctx.state.admin = admin;
          ctx.state.user = admin;
          return next();
        }
      }

      return next();
    });
  },
});
