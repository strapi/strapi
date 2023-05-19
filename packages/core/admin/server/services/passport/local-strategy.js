'use strict';

const { toLower } = require('lodash/fp');
const { Strategy: LocalStrategy } = require('passport-local');
const { isSsoLocked } = require('./utils/sso-lock');

const createLocalStrategy = (strapi) => {
  return new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      session: false,
    },
    (email, password, done) => {
      return strapi.admin.services.auth
        .checkCredentials({
          email: toLower(email),
          password,
        })
        .then(async ([error, user, message]) => {
          if (await isSsoLocked(user)) {
            return done(error, null, {
              message: 'Login not allowed, please contact your administrator',
            });
          }

          return done(error, user, message);
        })
        .catch((error) => done(error));
    }
  );
};

module.exports = createLocalStrategy;
