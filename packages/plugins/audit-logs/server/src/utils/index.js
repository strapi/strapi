'use strict';

const { sanitizeData } = require('./sanitize');
const { createLogger } = require('./logger');
const { handleControllerError, withErrorHandling, isValidationError } = require('./error-handler');
const { mapLogEntryToDb, mapLogEntriesToDb, isValidLogEntry } = require('./data-mapper');

/**
 * Retrieve a local plugin service
 * @param {string} name - Service name
 * @returns {object} Service instance
 */
const getService = (name) => {
  return strapi.plugin('audit-logs').service(name);
};

module.exports = {
  getService,
  sanitizeData,
  createLogger,
  handleControllerError,
  withErrorHandling,
  isValidationError,
  mapLogEntryToDb,
  mapLogEntriesToDb,
  isValidLogEntry,
};
