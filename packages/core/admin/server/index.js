'use strict';

const { getService } = require('./utils');

module.exports = {
  // TODO: update load middleware to not load the admin middleware from here
  // TODO: load bootstrap / register independently
  async destroy() {
    const { conditionProvider, actionProvider } = getService('permission');

    await conditionProvider.clear();
    await actionProvider.clear();
  },
  config: require('./config'),
  services: require('./services'),
  controllers: require('./controllers'),
  models: require('./content-types'),
};
