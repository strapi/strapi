'use strict';

const winston = require('winston');

const formats = require('./formats');
const createDefaultConfiguration = require('./default-configuration');
const createOutputFileConfiguration = require('./output-file-configuration');

const createLogger = (userConfiguration = {}) => {
  const configuration = createDefaultConfiguration();

  Object.assign(configuration, userConfiguration);

  return winston.createLogger(configuration);
};

module.exports = { createLogger, winston, formats, createOutputFileConfiguration };
