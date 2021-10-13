'use strict';

// eslint-disable-next-line node/no-extraneous-require
const { features } = require('strapi/lib/utils/ee');

const createLocalStrategy = require('../../services/passport/local-strategy');
const sso = require('./passport/sso');

const getPassportStrategies = () => {
  const localStrategy = createLocalStrategy(strapi);

  if (!features.isEnabled('sso')) {
    return [localStrategy];
  }

  if (!strapi.isLoaded) {
    sso.syncProviderRegistryWithConfig();
  }

  const providers = sso.providerRegistry.getAll();
  const strategies = providers.map(provider => provider.createStrategy(strapi));

  return [localStrategy, ...strategies];
};

module.exports = {
  getPassportStrategies,
};

if (features.isEnabled('sso')) {
  Object.assign(module.exports, sso);
}
