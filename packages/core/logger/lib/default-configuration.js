'use strict';

const { transports } = require('winston');
const { LEVEL, LEVEL_LABEL, LEVELS } = require('./constants');
const { prettyPrint } = require('./formats');

const createDefaultConfiguration = () => {
  return {
    level: LEVEL,
    levels: LEVELS,
    transports: [new transports.Console({ level: LEVEL_LABEL, format: prettyPrint() })],
  };
};

module.exports = createDefaultConfiguration;
