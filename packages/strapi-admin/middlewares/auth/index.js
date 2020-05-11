'use strict';

const passport = require('koa-passport');
const { Strategy: LocalStrategy } = require('passport-local');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');

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

const createJWTStrategy = strapi => {
  const { options, secret } = strapi.admin.services.auth.getJWTOptions();

  const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: secret,
    jsonWebTokenOptions: options,
  };

  return new JwtStrategy(opts, function({ id }, done) {
    strapi
      .query('administrator', 'admin')
      .findOne({ id })
      .then(user => {
        if (user) {
          return done(null, user);
        } else {
          return done(null, false);
        }
      })
      .catch(err => {
        return done(err, false);
      });
  });
};

module.exports = strapi => ({
  initialize() {
    passport.use(createLocalStrategy(strapi));
    passport.use(createJWTStrategy(strapi));

    // strapi.app.use(passport.authenticate('jwt', { session: false }));
    strapi.app.use(passport.initialize());
  },
});
