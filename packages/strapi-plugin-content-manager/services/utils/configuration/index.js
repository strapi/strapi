'use strict';

const { createDefaultSettings, syncSettings } = require('./settings');
const { createDefaultMetadatas, syncMetadatas } = require('./metadatas');
const { createDefaultLayouts, syncLayouts } = require('./layouts');
const { createModelConfigurationSchema } = require('../../../controllers/validation');

async function validateCustomConfig(schema) {
  try {
    await createModelConfigurationSchema(schema, {
      allowUndefined: true,
    }).validate(schema.config);
  } catch (error) {
    throw new Error(
      `Invalid Model configuration for model ${schema.uid}. Verify your {{modelName}}.config.js(on) file:\n  - ${error.message}\n`
    );
  }
}

async function createDefaultConfiguration(schema) {
  await validateCustomConfig(schema);

  return {
    settings: await createDefaultSettings(schema),
    metadatas: await createDefaultMetadatas(schema),
    layouts: await createDefaultLayouts(schema),
  };
}

async function syncConfiguration(conf, schema) {
  await validateCustomConfig(schema);

  return {
    settings: await syncSettings(conf, schema),
    layouts: await syncLayouts(conf, schema),
    metadatas: await syncMetadatas(conf, schema),
  };
}

module.exports = {
  createDefaultConfiguration,
  syncConfiguration,
};
