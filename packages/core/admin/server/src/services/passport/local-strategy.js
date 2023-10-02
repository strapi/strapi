'use strict';

const { toLower } = require('lodash/fp');
const { Strategy: LocalStrategy } = require('passport-local');

const createLocalStrategy = (strapi, middleware) => {
  return new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      session: false,
    },
    (email, password, done) => {
      return strapi.admin.services.auth
        .checkCredentials({ email: toLower(email), password })
        .then(async ([error, user, message]) => {
          if (middleware) {
            return middleware([error, user, message], done);
          }

          return done(error, user, message);
        })
        .catch((error) => done(error));
    }
  );
};

module.exports = createLocalStrategy;
