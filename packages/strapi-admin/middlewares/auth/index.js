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
        .catch(error => done(error));
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

        const { payload, isValid } = strapi.admin.services.token.decodeJwtToken(token);

        if (isValid) {
          // request is made by an admin
          const admin = await strapi.query('user', 'admin').findOne({ id: payload.id }, []);

          if (!admin || !(admin.isActive === true)) {
            return ctx.forbidden('Invalid credentials');
          }

          ctx.state.admin = admin;
          ctx.state.user = admin;
          ctx.state.isAuthenticatedAdmin = true;
          return next();
        }
      }

      return next();
    });
  },
});
