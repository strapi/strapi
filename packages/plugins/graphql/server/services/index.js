'use strict';

const old = require('./old');
const generators = require('./generators');
const typeRegistry = require('./type-registry');
const utils = require('./utils');
const constants = require('./constants');
const internals = require('./internals');
const builders = require('./builders');

module.exports = {
  builders,
  generators,
  utils,
  constants,
  internals,
  'type-registry': typeRegistry,
  ////////////////////
  old,
};
