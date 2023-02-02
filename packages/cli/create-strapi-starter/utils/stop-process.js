'use strict';

const logger = require('./logger');

module.exports = function stopProcess(message) {
  if (message) logger.error(message);
  process.exit(1);
};
