'use strict';

/**
 * Logger.
 */

const pino = require('pino');
const _ = require('lodash');

function getBool(envVar, defaultValue) {
  if (_.isBoolean(envVar)) return envVar;
  if (_.isString(envVar)) {
    if (envVar === 'true') return true;
    if (envVar === 'false') return false;
  }
  return defaultValue;
}

const loggerConfig = {
  level: 10,
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
