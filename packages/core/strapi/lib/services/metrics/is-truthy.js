'use strict';

const _ = require('lodash');

/**
 * @param {any} val
 */
const isTruthy = val => {
  return [1, true].includes(val) || ['true', '1'].includes(_.toLower(val));
};

module.exports = isTruthy;
