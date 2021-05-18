'use strict';

const { config } = require('winston');

const LEVELS = config.npm.levels;
const LEVEL_LABEL = 'silly';
const LEVEL = LEVELS[LEVEL_LABEL];

module.exports = {
  LEVEL,
  LEVEL_LABEL,
  LEVELS,
};
