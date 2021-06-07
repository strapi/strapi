'use strict';

const { join } = require('path');
const { makeSchema } = require('nexus');

const { scalars, internals } = require('../types');
const typesBuilders = require('./type-builders');

const generateSchema = () => {
  const types = {};

  Object.assign(
    types,
    getScalars(),
    getInternals(),
    getContentTypes(),
    getContentTypesQueries(),
    getContentTypesMutations()
  );

  console.log(types);

  return makeSchema({
    types,
    outputs: {
      typegen: join(__dirname, '..', 'nexus-typegen.ts'),
      schema: join(__dirname, '..', 'schema.graphql'),
    },
  });
};

const getScalars = () => scalars;

const getInternals = () => internals;

const getContentTypes = () => {
  const cts = Object.values(strapi.contentTypes).filter(model => model.plugin !== 'admin');

  return typesBuilders.buildContentTypes(cts);
};

const getContentTypesQueries = () => {
  const cts = Object.values(strapi.contentTypes)
    .filter(ct => ct.plugin !== 'admin')
    .filter(ct => ct.kind !== 'singleType' && !ct.plugin);

  return typesBuilders.buildContentTypesQueries(cts);
};

const getContentTypesMutations = () => ({});

module.exports = { generateSchema };
