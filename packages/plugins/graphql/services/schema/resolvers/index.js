'use strict';

const associationResolvers = require('./association');
const { buildQueriesResolvers } = require('./query');
const { buildMutationsResolvers } = require('./mutation');

module.exports = {
  // Generics
  ...associationResolvers,

  // Builders
  buildMutationsResolvers,
  buildQueriesResolvers,
};
