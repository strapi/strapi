'use strict';

const associationResolvers = require('./association');
const queriesResolvers = require('./query');
const mutationsResolvers = require('./mutation');
const componentResolvers = require('./component');
const dynamicZoneResolvers = require('./dynamic-zone');

module.exports = (context) => ({
  // Generics
  ...associationResolvers(context),

  // Builders
  ...mutationsResolvers(context),
  ...queriesResolvers(context),
  ...componentResolvers(context),
  ...dynamicZoneResolvers(context),
});
