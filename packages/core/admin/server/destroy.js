'use strict';

const { getService } = require('./utils');

module.exports = async () => {
  const { conditionProvider, actionProvider } = getService('permission');

  await conditionProvider.clear();
  await actionProvider.clear();
};
