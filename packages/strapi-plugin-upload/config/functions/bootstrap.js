'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 */

module.exports = async () => {
  // set plugin store
  const configurator = strapi.store({
    type: 'plugin',
    name: 'upload',
    key: 'settings',
  });

  strapi.plugins.upload.provider = createProvider(
    strapi.plugins.upload.config || {}
  );

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

const createProvider = ({ provider, providerOptions }) => {
  try {
    return require(`strapi-provider-upload-${provider}`).init(providerOptions);
  } catch (err) {
    strapi.log.error(err);
    throw new Error(
      `The provider package isn't installed. Please run \`npm install strapi-provider-upload-${provider}\``
    );
  }
};
