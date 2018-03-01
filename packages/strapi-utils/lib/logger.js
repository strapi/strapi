'use strict';

/**
 * Logger.
 */

const pino = require('pino');
const _ = require('lodash');

const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

function getLogLevel() {
  if (_.isString(process.env.STRAPI_LOG_LEVEL) && _.includes(logLevels, process.env.STRAPI_LOG_LEVEL.toLowerCase())) {
    return process.env.STRAPI_LOG_LEVEL;
  }
  return 'debug';
}

function getBool(envVar, defaultValue) {
  if (_.isBoolean(envVar)) return envVar;
  if (_.isString(envVar)) {
    if (envVar === 'true') return true;
    if (envVar === 'false') return false;
  }
  return defaultValue;
}

const loggerConfig = {
  level: getLogLevel(),
  timestamp: getBool(process.env.STRAPI_LOG_TIMESTAMP, false),
  prettyPrint: getBool(process.env.STRAPI_LOG_PRETTY_PRINT, true),
  forceColor: getBool(process.env.STRAPI_LOG_FORCE_COLOR, true),
};

module.exports = pino(loggerConfig);
