'use strict';

const args = require('./args');
const scalars = require('./scalars');
const types = require('./types');
const helpers = require('./helpers');

module.exports = (context) => ({
  args: args(context),
  scalars: scalars(context),
  buildInternalTypes: types(context),
  helpers: helpers(context),
});
