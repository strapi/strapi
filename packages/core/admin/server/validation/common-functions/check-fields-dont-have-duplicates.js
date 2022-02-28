'use strict';

const _ = require('lodash');

const checkFieldsDontHaveDuplicates = fields => {
  if (_.isNil(fields)) {
    // Only check if the fields exist
    return true;
  } else if (!Array.isArray(fields)) {
    return false;
  }

  return _.uniq(fields).length === fields.length;
};

module.exports = checkFieldsDontHaveDuplicates;
