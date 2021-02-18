'use strict';

const _ = require('lodash');

/**
 * remove condition ids that don't exist
 * @returns {[string]}
 */
const removeUnkownConditionIds = conditionsIds => {
  if (!Array.isArray(conditionsIds)) {
    return conditionsIds;
  }

  const existingIds = strapi.admin.services.permission.conditionProvider.getAllIds();

  return _.intersection(conditionsIds, existingIds);
};

module.exports = {
  removeUnkownConditionIds,
};
