'use strict';

const winston = require('winston');

const formats = require('./formats');
const configs = require('./configs');

const createLogger = (userConfiguration = {}) => {
  const configuration = configs.createDefaultConfiguration();

  Object.assign(configuration, userConfiguration);

  return winston.createLogger(configuration);
};

module.exports = {
  createLogger,
  winston,
  formats,
  configs,
};
