const { createDefaultSettings, syncSettings } = require('./settings');
const { createDefaultMetadatas, syncMetadatas } = require('./metadatas');
const { createDefaultLayouts, syncLayouts } = require('./layouts');

async function createDefaultConfiguration(model) {
  return {
    settings: await createDefaultSettings(),
    metadatas: await createDefaultMetadatas(model),
    layouts: await createDefaultLayouts(model),
  };
}

async function syncConfiguration(conf, model) {
  return {
    settings: await syncSettings(conf, model),
    layouts: await syncLayouts(conf, model),
    metadatas: await syncMetadatas(conf, model),
  };
}

module.exports = {
  createDefaultConfiguration,
  syncConfiguration,
};
