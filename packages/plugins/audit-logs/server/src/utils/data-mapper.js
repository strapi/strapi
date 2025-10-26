'use strict';

/**
 * Data Mapper Utility
 * Handles transformation of log entry objects for database operations
 */

/**
 * Map a log entry object to database format
 * @param {object} logEntry - The log entry to map
 * @returns {object} Mapped object ready for database insertion
 */
function mapLogEntryToDb(logEntry) {
  return {
    contentType: logEntry.contentType,
    recordId: logEntry.recordId,
    action: logEntry.action,
    timestamp: logEntry.timestamp || new Date(),
    userId: logEntry.userId || null,
    userEmail: logEntry.userEmail || null,
    payload: logEntry.payload || {},
  };
}

/**
 * Map multiple log entries to database format
 * @param {Array<object>} logEntries - Array of log entries
 * @returns {Array<object>} Array of mapped objects
 */
function mapLogEntriesToDb(logEntries) {
  if (!Array.isArray(logEntries)) {
    return [];
  }

  return logEntries.map(mapLogEntryToDb);
}

/**
 * Validate log entry has required fields
 * @param {object} logEntry - The log entry to validate
 * @returns {boolean} True if valid
 */
function isValidLogEntry(logEntry) {
  return (
    logEntry &&
    typeof logEntry === 'object' &&
    logEntry.contentType &&
    logEntry.recordId &&
    logEntry.action
  );
}

module.exports = {
  mapLogEntryToDb,
  mapLogEntriesToDb,
  isValidLogEntry,
};
