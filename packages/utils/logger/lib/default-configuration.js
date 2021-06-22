'use strict';

const { transports, format } = require('winston');
const { LEVEL, LEVEL_LABEL, LEVELS } = require('./constants');
const { prettyPrint } = require('./formats');

const createDefaultConfiguration = () => {
  return {
    level: LEVEL,
    levels: LEVELS,
    format: format.errors({ stack: true }),
    transports: [new transports.Console({ level: LEVEL_LABEL, format: prettyPrint() })],
  };
};

module.exports = createDefaultConfiguration;
