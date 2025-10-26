'use strict';

const { LOG_PREFIX } = require('../constants');

/**
 * Logger Utility
 * Provides consistent logging with automatic prefix across the plugin
 */

/**
 * Create a logger instance with automatic prefix
 * @param {object} strapi - Strapi instance
 * @returns {object} Logger with error, warn, info, debug methods
 */
function createLogger(strapi) {
  return {
    /**
     * Log error message
     * @param {string} message - Error message
     * @param {...any} args - Additional arguments
     */
    error(message, ...args) {
      strapi.log.error(`[${LOG_PREFIX}] ${message}`, ...args);
    },

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {...any} args - Additional arguments
     */
    warn(message, ...args) {
      strapi.log.warn(`[${LOG_PREFIX}] ${message}`, ...args);
    },

    /**
     * Log info message
     * @param {string} message - Info message
     * @param {...any} args - Additional arguments
     */
    info(message, ...args) {
      strapi.log.info(`[${LOG_PREFIX}] ${message}`, ...args);
    },

    /**
     * Log debug message
     * @param {string} message - Debug message
     * @param {...any} args - Additional arguments
     */
    debug(message, ...args) {
      strapi.log.debug(`[${LOG_PREFIX}] ${message}`, ...args);
    },
  };
}

module.exports = {
  createLogger,
};
