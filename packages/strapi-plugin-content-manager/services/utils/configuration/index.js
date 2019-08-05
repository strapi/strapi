'use strict';

const { createDefaultSettings, syncSettings } = require('./settings');
const { createDefaultMetadatas, syncMetadatas } = require('./metadatas');
const { createDefaultLayouts, syncLayouts } = require('./layouts');
const { formatContentTypeSchema } = require('../../ContentTypes');

async function createDefaultConfiguration(model) {
  // convert model to schema

  const schema = formatContentTypeSchema(model);
  schema.config = model.config || {};

  return {
    settings: await createDefaultSettings(schema),
    metadatas: await createDefaultMetadatas(schema),
    layouts: await createDefaultLayouts(schema),
  };
}

async function syncConfiguration(conf, model) {
  // convert model to schema

  const schema = formatContentTypeSchema(model);
  schema.config = model.config || {};

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
