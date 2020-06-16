'use strict';

const getConditionId = ({ name, plugin }) => {
  let id;

  if (plugin === 'admin') {
    id = `admin::${name}`;
  } else if (plugin) {
    id = `plugins::${plugin}.${name}`;
  } else {
    id = `application::${name}`;
  }
  return id;
};

const createCondition = condition => ({
  ...condition,
  id: getConditionId(condition),
});

module.exports = {
  getConditionId,
  createCondition,
};
