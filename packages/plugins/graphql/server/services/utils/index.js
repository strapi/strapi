'use strict';

const mappers = require('./mappers');
const attributes = require('./attributes');
const naming = require('./naming');

module.exports = context => ({
  naming: naming(context),
  attributes: attributes(context),
  mappers: mappers(context),
});
