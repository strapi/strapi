'use strict';
/**
 * Upload plugin bootstrapi.
 *
 * It initializes the provider and sets the default settings in db.
 */

module.exports = async () => {
  // set plugin store
  const configurator = strapi.store({
    type: 'plugin',
    name: 'upload',
    key: 'settings',
  });

  strapi.plugins.upload.provider = createProvider(strapi.plugins.upload.config || {});

  // if provider config does not exist set one by default
  const config = await configurator.get();

  if (!config) {
    await configurator.set({
      value: {
        sizeOptimization: true,
        responsiveDimensions: true,
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
