'use strict';

const _ = require('lodash');

/**
 * @param {any} obj
 */
const removeUndefined = obj => _.pickBy(obj, value => typeof value !== 'undefined');

module.exports = {
  removeUndefined,
};
