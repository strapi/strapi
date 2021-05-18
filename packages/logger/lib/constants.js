'use strict';

const { config } = require('winston');

const COLORIZE = true;
const USE_TIMESTAMPS = true;
const LEVEL = config.npm.levels.silly;
const LEVELS = config.npm.levels;

module.exports = {
  COLORIZE,
  USE_TIMESTAMPS,
  LEVEL,
  LEVELS,
};
