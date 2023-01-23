'use strict';

const winston = require('winston');

const formats = require('./formats');
const createDefaultConfiguration = require('./config/default-configuration');
const createOutputFileConfiguration = require('./config/output-file-configuration');

const createLogger = (userConfiguration = {}) => {
  const configuration = createDefaultConfiguration();

  Object.assign(configuration, userConfiguration);

  return winston.createLogger(configuration);
};

module.exports = {
  createLogger,
  winston,
  formats,
  config: { createDefaultConfiguration, createOutputFileConfiguration },
};
