'use strict';

const old = require('./old');
const schema = require('./schema');
const typeRegistry = require('./type-registry');

module.exports = {
  old,
  schema,
  'type-registry': typeRegistry,
};
