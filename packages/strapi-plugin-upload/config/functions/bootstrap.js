'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 */
const _ = require('lodash');

module.exports = async () => {
  // set plugin store
  const configurator = strapi.store({
    type: 'plugin',
    name: 'upload',
    key: 'settings',
  });

  const installedProviders = Object.keys(strapi.config.info.dependencies)
    .filter(d => d.includes('strapi-provider-upload-'))
    .concat('strapi-provider-upload-local');

  for (let installedProvider of _.uniq(installedProviders)) {
    strapi.plugins.upload.config.providers.push(require(installedProvider));
  }

  // if provider config does not exist set one by default
  const config = await configurator.get();

  if (!config) {
    await configurator.set({
      value: {
        sizeOptimization: true,
        responsiveDimensions: true,
        videoPreview: true,
      },
    });
  }
};
