'use strict';

const _ = require('lodash');

const isTruthy = val => {
  return [1, true].includes(val) || ['true', '1'].includes(_.toLower(val));
};

module.exports = isTruthy;
