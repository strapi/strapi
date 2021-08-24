'use strict';

const old = require('./old');
const generators = require('./generators');
const typeRegistry = require('./type-registry');

const builders = require('./builders');

module.exports = {
  builders,
  generators,
  'type-registry': typeRegistry,
  ////////////////////
  old,
};
