'use strict';

// eslint-disable-next-line node/no-extraneous-require
const { features } = require('@strapi/strapi/lib/utils/ee');

const createLocalStrategy = require('../../../server/services/passport/local-strategy');
const sso = require('./passport/sso');

// wrap functions with feature flag to allow execute code lazyly
// Looking at the code wrapped we probably can just add a condition in the functions
const wrapWithFeatureFlag = (flag, obj) => {
  const newObj = {};

  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === 'function') {
      newObj[key] = (...args) => {
        if (!features.isEnabled(flag)) {
          throw new Error(`${key} cannot be executed`);
        }

        return obj[key].apply(newObj, ...args);
      };
    } else {
      newObj[key] = obj[key];
    }
  });

  return newObj;
};

const getPassportStrategies = () => {
  const localStrategy = createLocalStrategy(strapi);

  if (!features.isEnabled('sso')) {
    return [localStrategy];
  }

  if (!strapi.isLoaded) {
    sso.syncProviderRegistryWithConfig();
  }

  const providers = sso.providerRegistry.getAll();
  const strategies = providers.map((provider) => provider.createStrategy(strapi));

  return [localStrategy, ...strategies];
};

module.exports = {
  getPassportStrategies,
  ...wrapWithFeatureFlag('sso', sso),
};
