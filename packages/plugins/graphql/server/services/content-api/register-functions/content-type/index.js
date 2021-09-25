'use strict';

const { registerDynamicZonesDefinition } = require('./dynamic-zones');
const { registerEnumsDefinition } = require('./enums');
const { registerInputsDefinition } = require('./inputs');
const { registerFiltersDefinition } = require('./filters');

module.exports = {
  registerDynamicZonesDefinition,
  registerFiltersDefinition,
  registerInputsDefinition,
  registerEnumsDefinition,
};
