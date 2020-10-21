'use strict';

const { createDefaultSettings, syncSettings } = require('./settings');
const { createDefaultMetadatas, syncMetadatas } = require('./metadatas');
const { createDefaultLayouts, syncLayouts } = require('./layouts');
const { formatContentTypeSchema } = require('../../content-types');
const { createModelConfigurationSchema } = require('../../../controllers/validation');

async function validateCustomConfig(model, schema) {
  try {
    await createModelConfigurationSchema(model, schema, {
      allowUndefined: true,
    }).validate(model.config);
  } catch (error) {
    throw new Error(
      `Invalid Model configuration for model ${model.uid}. Verify your {{modelName}}.config.js(on) file:\n  - ${error.message}\n`
    );
  }
}

async function createDefaultConfiguration(model) {
  // convert model to schema

  const schema = formatContentTypeSchema(model);
  schema.primaryKey = model.primaryKey;

  if (model.config) {
    await validateCustomConfig(model, schema);
    schema.config = model.config;
  }

  return {
    settings: await createDefaultSettings(schema),
    metadatas: await createDefaultMetadatas(schema),
    layouts: await createDefaultLayouts(schema),
  };
}

async function syncConfiguration(conf, model) {
  // convert model to schema
  const schema = formatContentTypeSchema(model);
  schema.primaryKey = model.primaryKey;

  if (model.config) {
    await validateCustomConfig(model, schema);
    schema.config = model.config;
  }

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
