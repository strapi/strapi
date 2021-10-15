'use strict';

/**
 * @typedef {import('winston').LoggerOptions} LoggerOptions
 */

const { transports } = require('winston');
const { LEVEL, LEVEL_LABEL, LEVELS } = require('./constants');
const { prettyPrint } = require('./formats');

const createDefaultConfiguration = () => {
  /**
   * @type {LoggerOptions}
   */
  const defaultOptions = {
    // @ts-ignore
    level: LEVEL,
    levels: LEVELS,
    format: prettyPrint(),
    transports: [new transports.Console({ level: LEVEL_LABEL })],
  };

  return defaultOptions;
};

module.exports = createDefaultConfiguration;
