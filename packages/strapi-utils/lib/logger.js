"use strict";

/**
 * Logger.
 */


const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const pino = require("pino");

const logLevels = ["fatal", "error", "warn", "info", "debug", "trace"];

function getLogLevel() {
  if (
    _.isString(process.env.STRAPI_LOG_LEVEL) &&
    _.includes(logLevels, process.env.STRAPI_LOG_LEVEL.toLowerCase())
  ) {
    return process.env.STRAPI_LOG_LEVEL;
  }
  return "debug";
}

const logTypes = ["stdout", "file"];
function getLogType() {
  if (
    _.isString(process.env.STRAPI_LOG_TYPE) &&
    _.includes(logTypes, process.env.STRAPI_LOG_TYPE.toLowerCase())
  ) {
    return process.env.STRAPI_LOG_TYPE;
  }
  return "stdout";
}

function parseLogPath(defaultLogFilename = "strapi.log") {
  if (_.isString(process.env.STRAPI_LOG_PATH)) {
    return path.parse(process.env.STRAPI_LOG_PATH);
  }
  return path.parse(path.join(__dirname, defaultLogFilename));
}

function getLogDir() {
  return parseLogPath().dir;
}

function getLogBase() {
  return parseLogPath().base;
}

const logFile = path.join(getLogDir(), getLogBase());

function getBool(envVar, defaultValue) {
  if (_.isBoolean(envVar)) return envVar;
  if (_.isString(envVar)) {
    if (envVar === "true") return true;
    if (envVar === "false") return false;
  }
  return defaultValue;
}

const loggerConfig = {
  level: getLogLevel(),
  timestamp: getBool(process.env.STRAPI_LOG_TIMESTAMP, false),
  // prettyPrint: getBool(process.env.STRAPI_LOG_PRETTY_PRINT, true),
  forceColor: getBool(process.env.STRAPI_LOG_FORCE_COLOR, true)
};

const pretty = pino.pretty({
  formatter: (logs, options) => {
    return `${options.asColoredText(
      { level: 10 },
      `[${new Date().toISOString()}]`
    )} ${options.prefix.toLowerCase()} ${logs.msg}`;
  }
});

let logger;
switch (getLogType()) {
  case "stdout":
    pretty.pipe(process.stdout);
    logger = getBool(process.env.STRAPI_LOG_PRETTY_PRINT, true)
      ? pino(loggerConfig, pretty)
      : pino(loggerConfig);
    break;
  case "file":
    pretty.pipe(fs.createWriteStream(logFile, { flags: "a" }));
    logger = getBool(process.env.STRAPI_LOG_PRETTY_PRINT, true)
      ? pino(loggerConfig, pretty)
      : pino(loggerConfig, fs.createWriteStream(logFile, { flags: "a" }));
    break;
  default:
    pretty.pipe(process.stdout);
    logger = getBool(process.env.STRAPI_LOG_PRETTY_PRINT, true)
      ? pino(loggerConfig, pretty)
      : pino(loggerConfig);
}

module.exports = logger;
