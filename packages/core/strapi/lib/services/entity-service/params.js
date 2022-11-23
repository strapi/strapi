'use strict';

const { pick } = require('lodash/fp');

const pickSelectionParams = pick(['fields', 'populate']);

module.exports = {
  pickSelectionParams,
};
