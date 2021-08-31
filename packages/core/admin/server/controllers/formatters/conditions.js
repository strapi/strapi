'use strict';

const { pick, map } = require('lodash/fp');

// visible fields for the API
const publicFields = ['id', 'displayName', 'category'];

const formatConditions = map(pick(publicFields));

module.exports = {
  formatConditions,
};
