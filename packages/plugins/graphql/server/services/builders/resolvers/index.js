'use strict';

const associationResolvers = require('./association');
const queriesResolvers = require('./query');
const mutationsResolvers = require('./mutation');
const componentResolver = require('./component');

module.exports = context => ({
  // Generics
  ...associationResolvers(context),

  // Builders
  ...mutationsResolvers(context),
  ...queriesResolvers(context),
  ...componentResolver(context),
});
