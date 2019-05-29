'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 */
const _ = require('lodash');

module.exports = async cb => {
  // set plugin store
  const pluginStore = strapi.store({
    environment: strapi.config.environment,
    type: 'plugin',
    name: 'email',
  });

  strapi.plugins.email.config.providers = [];

  const installedProviders = Object.keys(strapi.config.info.dependencies)
    .filter(d => d.startsWith('strapi-provider-email-'))
    .concat('strapi-provider-email-sendmail');

  for (let installedProvider of _.uniq(installedProviders)) {
    strapi.plugins.email.config.providers.push(require(installedProvider));
  }

  try {
    // if provider config does not exist set one by default
    const config = await pluginStore.get({ key: 'provider' });

    if (!config) {
      const provider = _.find(strapi.plugins.email.config.providers, {
        provider: 'sendmail',
      });

      const value = _.assign({}, provider, {
        // TODO: set other default settings here
      });

      await pluginStore.set({ key: 'provider', value });
    }
  } catch (err) {
    strapi.log.error(err);
    strapi.stop();
  }

  cb();
};
