'use strict';

const { isString } = require('lodash/fp');
const { getService } = require('../utils');

const isValidCondition = condition => {
  const { conditionProvider } = getService('permission');

  return isString(condition) && !!conditionProvider.get(condition);
};

module.exports = {
  isValidCondition,
};
