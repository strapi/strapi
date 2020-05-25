'use strict';

const _ = require('lodash');

const removeUndefined = obj => _.pickBy(obj, value => typeof value !== 'undefined');

module.exports = {
  removeUndefined,
};
