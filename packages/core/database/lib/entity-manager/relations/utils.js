'use strict';

const { castArray } = require('lodash/fp');

const toId = (value) => value.id || value;
const toIds = (value) => castArray(value || []).map(toId);

module.exports = {
  toIds,
};
