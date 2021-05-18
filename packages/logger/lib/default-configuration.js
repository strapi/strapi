'use strict';

const { format, transports } = require('winston');
const { COLORIZE, USE_TIMESTAMPS, LEVEL, LEVELS } = require('./constants');

const getFormat = formatOptions => {
  const { colorize = COLORIZE, timestamps = USE_TIMESTAMPS } = formatOptions;
  const formats = [];

  if (timestamps === true) {
    formats.push(format.timestamp());
  }

  if (colorize === true) {
    formats.push(format.colorize());
  }

  formats.push(
    format.printf(({ level, message, timestamp }) => {
      return `${timestamps ? '[' + timestamp + '] ' : ''}${level}: ${message}`;
    })
  );

  return format.combine(...formats);
};

const getDefaultTransports = () => {
  return [new transports.Console({ level: 'silly' })];
};

const createDefaultConfiguration = options => {
  const { level = LEVEL, levels = LEVELS } = options;

  return {
    level,
    levels,
    format: getFormat(options),
    transports: getDefaultTransports(),
  };
};

module.exports = createDefaultConfiguration;
