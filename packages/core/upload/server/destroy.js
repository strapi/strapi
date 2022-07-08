'use strict';

const { getService } = require('./utils');

module.exports = () => {
  getService('metrics').stopRegularMetricsUpdate();
};
