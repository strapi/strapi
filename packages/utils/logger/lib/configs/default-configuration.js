'use strict';

const { transports } = require('winston');
const { LEVEL_LABEL, LEVELS } = require('../constants');
const { prettyPrint } = require('../formats');

const createDefaultConfiguration = () => {
  return {
    level: LEVEL_LABEL,
    levels: LEVELS,
    format: prettyPrint(),
    transports: [new transports.Console()],
  };
};

module.exports = createDefaultConfiguration;
