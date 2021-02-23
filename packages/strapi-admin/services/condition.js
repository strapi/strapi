'use strict';

const { isString, intersection } = require('lodash/fp');
const { getService } = require('../utils');

/**
 * remove condition ids that don't exist
 * @returns {[string]}
 */
const removeUnkownConditionIds = conditionsIds => {
  if (!Array.isArray(conditionsIds)) {
    return conditionsIds;
  }

  const existingIds = strapi.admin.services.permission.conditionProvider.getAllIds();

  return intersection(conditionsIds, existingIds);
};

const isValidCondition = condition => {
  const { conditionProvider } = getService('permission');

  return isString(condition) && !!conditionProvider.getById(condition);
};

module.exports = {
  isValidCondition,
  removeUnkownConditionIds,
};
