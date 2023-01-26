'use strict';

const { transports } = require('winston');
const { LEVEL_LABEL, LEVELS } = require('../constants');
const { prettyPrint } = require('../formats');
const { excludeColors } = require('../formats');

const createOutputFileConfiguration = (filename) => {
  return {
    level: LEVEL_LABEL,
    levels: LEVELS,
    format: prettyPrint(),
    transports: [
      new transports.Console(),
      new transports.File({ level: 'error', filename, format: excludeColors }),
    ],
  };
};

module.exports = createOutputFileConfiguration;
