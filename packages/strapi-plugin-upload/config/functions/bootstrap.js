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
    name: 'upload',
  });

  strapi.plugins.upload.config.providers = [];

  const installedProviders = Object.keys(strapi.config.info.dependencies)
    .filter(d => d.startsWith('strapi-provider-upload-'))
    .concat('strapi-provider-upload-local');

  for (let installedProvider of _.uniq(installedProviders)) {
    strapi.plugins.upload.config.providers.push(require(installedProvider));
  }

  try {
    // if provider config does not exist set one by default
    const config = await pluginStore.get({ key: 'provider' });

    if (!config) {
      const provider = _.find(strapi.plugins.upload.config.providers, {
        provider: 'local',
      });

      const value = _.assign({}, provider, {
        enabled: true,
        // by default limit size to 1 GB
        sizeLimit: 1000000,
      });

      await pluginStore.set({ key: 'provider', value });
    }
  } catch (err) {
    strapi.log.error(err);
    strapi.stop();
  }
  cb();
};
