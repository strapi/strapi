'use strict';

const mappers = require('./mappers');
const attributes = require('./attributes');
const naming = require('./naming');
const config = require('./config');

module.exports = context => ({
  naming: naming(context),
  attributes: attributes(context),
  mappers: mappers(context),
  config: config(context),
});
