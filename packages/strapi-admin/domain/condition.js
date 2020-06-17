'use strict';

const getConditionId = ({ name, plugin }) => {
  if (plugin === 'admin') {
    return `admin::${name}`;
  } else if (plugin) {
    return `plugins::${plugin}.${name}`;
  }

  return `application::${name}`;
};

const createCondition = condition => ({
  ...condition,
  id: getConditionId(condition),
});

module.exports = {
  getConditionId,
  createCondition,
};
