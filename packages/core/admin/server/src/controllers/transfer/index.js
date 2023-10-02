'use strict';

const { mapKeys } = require('lodash/fp');

const runner = require('./runner');
const token = require('./token');

const prefixActionsName = (prefix, dict) => mapKeys((key) => `${prefix}-${key}`, dict);

module.exports = {
  ...prefixActionsName('runner', runner),
  ...prefixActionsName('token', token),
};
