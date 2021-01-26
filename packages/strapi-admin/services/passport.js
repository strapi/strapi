'use strict';

const passport = require('koa-passport');

const createProviderRegistry = require('./passport/provider-registry');
const createLocalStrategy = require('./passport/local-strategy');

const providerRegistry = createProviderRegistry();

const getProviderCallbackUrl = providerName => `/admin/connect/${providerName}`;

const syncProviderRegistryWithConfig = () => {
  const { providers = [] } = strapi.config.get('server.admin.auth', {});

  providerRegistry.registerMany(providers);
};

const init = () => {
  syncProviderRegistryWithConfig();

  const localStrategy = createLocalStrategy(strapi);

  const providers = providerRegistry.toArray();
  const strategies = providers.map(provider => provider.createStrategy(strapi));

  // Register the local strategy
  passport.use(localStrategy);

  // And add the ones provided with the config
  strategies.forEach(provider => passport.use(provider));

  return passport.initialize();
};

module.exports = {
  init,
  syncProviderRegistryWithConfig,
  providerRegistry,
  getProviderCallbackUrl,
};
