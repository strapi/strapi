'use strict';

/**
 * Logger.
 */

const pino = require('pino');
const _ = require('lodash');

const logLevels = Object.keys(pino.levels.values);

function getLogLevel() {
  if (!_.isString(process.env.STRAPI_LOG_LEVEL)) {
    // Default value.
    return 'debug';
  }

  const logLevel = process.env.STRAPI_LOG_LEVEL.toLowerCase();

  if (!_.includes(logLevels, logLevel)) {
    throw new Error(
      "Invalid log level set in STRAPI_LOG_LEVEL environment variable. Accepted values are: '" +
        logLevels.join("', '") +
        "'."
    );
  }

  return logLevel;
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
  // prettyPrint: getBool(process.env.STRAPI_LOG_PRETTY_PRINT, true),
  forceColor: getBool(process.env.STRAPI_LOG_FORCE_COLOR, true),
};

const pretty = pino.pretty({
  formatter: (logs, options) => {
    return `${options.asColoredText(
      { level: 10 },
      `[${new Date().toISOString()}]`
    )} ${options.prefix.toLowerCase()} ${logs.stack ? logs.stack : logs.msg}`;
  },
});

pretty.pipe(process.stdout);

const logger = getBool(process.env.STRAPI_LOG_PRETTY_PRINT, true)
  ? pino(loggerConfig, pretty)
  : pino(loggerConfig);

module.exports = logger;
