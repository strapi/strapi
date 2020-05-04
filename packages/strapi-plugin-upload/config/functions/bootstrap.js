'use strict';
/**
 * Upload plugin bootstrap.
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

  await pruneObsoleteRelations();
};

const createProvider = ({ provider, providerOptions }) => {
  try {
    const providerInstance = require(`strapi-provider-upload-${provider}`).init(providerOptions);

    return Object.assign(Object.create(baseProvider), providerInstance);
  } catch (err) {
    strapi.log.error(err);
    throw new Error(
      `The provider package isn't installed. Please run \`npm install strapi-provider-upload-${provider}\``
    );
  }
};

const baseProvider = {
  extend(obj) {
    Object.assign(this, obj);
  },
  upload() {
    throw new Error('Provider upload method is not implemented');
  },
  delete() {
    throw new Error('Provider delete method is not implemented');
  },
};

const pruneObsoleteRelations = async () => {
  const { upload: plugin } = strapi.plugins;
  const modelIsNotDefined = !plugin || !plugin.models || !plugin.models.file;

  if (modelIsNotDefined || plugin.models.file.orm !== 'mongoose') {
    return;
  }

  await strapi.query('file', 'upload').custom(pruneObsoleteRelationsQuery)();
};

const pruneObsoleteRelationsQuery = ({ model }) => {
  const models = Array.from(strapi.db.models.values());
  const modelsId = models.map(model => model.globalId);

  return model.updateMany(
    { related: { $elemMatch: { kind: { $nin: modelsId } } } },
    { $pull: { related: { kind: { $nin: modelsId } } } }
  );
};
