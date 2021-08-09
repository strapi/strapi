'use strict';

const associationResolvers = require('./association');
const { buildQueriesResolvers } = require('./query');
const { buildMutationsResolvers } = require('./mutation');
const { buildComponentResolver } = require('./component');

module.exports = {
  // Generics
  ...associationResolvers,

  // Builders
  buildMutationsResolvers,
  buildQueriesResolvers,
  buildComponentResolver,
};
