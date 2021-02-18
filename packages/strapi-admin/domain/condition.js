'use strict';

const DEFAULT_CATEGORY = 'default';

const getConditionId = ({ name, plugin }) => {
  if (plugin === 'admin') {
    return `admin::${name}`;
  } else if (plugin) {
    return `plugins::${plugin}.${name}`;
  }

  return `application::${name}`;
};

const createCondition = condition => ({
  category: DEFAULT_CATEGORY,
  ...condition,
  id: getConditionId(condition),
});

module.exports = {
  getConditionId,
  createCondition,
};
