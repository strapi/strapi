'use strict';

// eslint-disable-next-line node/no-extraneous-require
const { features } = require('@strapi/strapi/lib/utils/ee');

const { UnauthorizedError } = require('@strapi/utils').errors;
const createLocalStrategy = require('../../../server/services/passport/local-strategy');
const sso = require('./passport/sso');
const { isSsoLocked } = require('../utils/sso-lock');

const localStrategyMiddleware = async ([error, user, message], done) => {
  // if we got a user, we need to check that it's not sso locked
  if (user && !error && (await isSsoLocked(user))) {
    return done(
      new UnauthorizedError('Login not allowed, please contact your administrator', {
        code: 'LOGIN_NOT_ALLOWED',
      }),
      user,
      message
    );
  }

  return done(error, user, message);
};

const getPassportStrategies = () => {
  if (!features.isEnabled('sso')) {
    return [createLocalStrategy(strapi)];
  }

  const localStrategy = createLocalStrategy(strapi, localStrategyMiddleware);

  if (!strapi.isLoaded) {
    sso.syncProviderRegistryWithConfig();
  }

  const providers = sso.providerRegistry.getAll();
  const strategies = providers.map((provider) => provider.createStrategy(strapi));

  return [localStrategy, ...strategies];
};

module.exports = {
  getPassportStrategies,
  ...sso,
};
