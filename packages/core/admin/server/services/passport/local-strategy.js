'use strict';

const { toLower } = require('lodash/fp');
const { Strategy: LocalStrategy } = require('passport-local');

const createLocalStrategy = strapi => {
  return new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      session: false,
    },
    (email, password, done) => {
      return strapi.admin.services.auth
        .checkCredentials({ email: toLower(email), password })
        .then(([error, user, message]) => done(error, user, message))
        .catch(error => done(error));
    }
  );
};

module.exports = createLocalStrategy;
