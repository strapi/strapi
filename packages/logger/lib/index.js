'use strict';

const winston = require('winston');

const createDefaultConfiguration = require('./default-configuration');

const createLogger = options => {
  const { override, ...rest } = options;

  const configuration = createDefaultConfiguration(rest);

  if (override) {
    Object.assign(configuration, override);
  }

  return winston.createLogger(configuration);
};

module.exports = { createLogger, winston };
